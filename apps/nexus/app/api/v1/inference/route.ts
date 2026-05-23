import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { verifyRequestSignature, isValidPubkey } from "@/lib/solana";
import { debit, ensureAgent, getBalance, tryDebit } from "@/lib/credits";
import { runInference } from "@/lib/inference";
import { isTaskType, route, type TaskType } from "@/lib/routing";
import { recordNonce } from "@/lib/nonces";
import { signReceipt } from "@/lib/receipts";
import { getAgentStats } from "@/lib/points";
import { log, newRequestId } from "@/lib/log";
import { computeFeeBreakdown } from "@/lib/pricing";
import { getFeeExemptPubkeys, recordBurnPoolFee } from "@/lib/burn-pool";
import { X402_NETWORKS } from "@/lib/x402";
import {
  enforcePubkey,
  rateLimitHeaders,
  type RateLimitDecision,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBKEY_HEADER = "x-agent-pubkey";
const SIG_HEADER = "x-nexus-signature";

const TIMESTAMP_SKEW_MS = 30_000;
const MIN_BALANCE_USDC = 0.001;

/**
 * The network the prepaid credit balance was originally funded on. The
 * burn_pool_ledger row needs a network value but the prepaid path
 * doesn't settle inline, so we use the env-configured x402 default
 * (the network deposits arrive on). Falls back to devnet.
 */
function getPrepaidNetwork(): string {
  const env = process.env.X402_NETWORK?.trim();
  if (!env) return X402_NETWORKS.solanaDevnet;
  const lower = env.toLowerCase();
  if (lower === "solana-mainnet" || lower === "solana:mainnet") {
    return X402_NETWORKS.solanaMainnet;
  }
  if (lower === "solana-devnet" || lower === "solana:devnet") {
    return X402_NETWORKS.solanaDevnet;
  }
  if (lower === "base" || lower === "base-mainnet" || lower === "eip155:8453") {
    return X402_NETWORKS.baseMainnet;
  }
  if (lower === "base-sepolia" || lower === "eip155:84532") {
    return X402_NETWORKS.baseSepolia;
  }
  return env;
}

type Body = {
  prompt?: string;
  task_type?: TaskType;
  nonce?: string;
  timestamp?: number;
  max_cost_usdc?: number;
};

function err(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

function rateLimited(d: RateLimitDecision): NextResponse {
  const retry_after_ms = Math.max(0, d.reset - Date.now());
  return new NextResponse(
    JSON.stringify({
      ok: false,
      error: "rate_limited",
      key_type: d.key_type,
      retry_after_ms,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        ...rateLimitHeaders(d),
      },
    }
  );
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const request_id = newRequestId(req);
  const t0 = Date.now();

  const pubkey = req.headers.get(PUBKEY_HEADER);
  const signature = req.headers.get(SIG_HEADER);

  if (!pubkey || !signature) {
    log.warn({ event: "inference.sig_invalid", request_id, reason: "missing_headers" });
    return err("missing_auth_headers", 401);
  }
  if (!isValidPubkey(pubkey)) {
    log.warn({ event: "inference.sig_invalid", request_id, reason: "invalid_pubkey" });
    return err("invalid_pubkey", 401);
  }

  const raw = await req.text();
  if (!verifyRequestSignature(raw, signature, pubkey)) {
    log.warn({
      event: "inference.sig_invalid",
      request_id,
      agent_pubkey: pubkey,
      reason: "bad_signature",
    });
    return err("invalid_signature", 401);
  }

  log.info({ event: "inference.signed_request", request_id, agent_pubkey: pubkey });

  const pkDecision = await enforcePubkey(pubkey);
  if (!pkDecision.allowed) {
    log.warn({
      event: "rate_limit.blocked",
      request_id,
      agent_pubkey: pubkey,
      key_type: "pubkey",
      limit: pkDecision.limit,
      remaining: pkDecision.remaining,
      reset_ms: pkDecision.reset,
    });
    return rateLimited(pkDecision);
  }

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    log.warn({ event: "inference.body_invalid", request_id, agent_pubkey: pubkey, reason: "json_parse" });
    return err("invalid_json", 400);
  }

  const { prompt, task_type, nonce, timestamp, max_cost_usdc } = body;
  if (typeof prompt !== "string" || prompt.length === 0) {
    log.warn({ event: "inference.body_invalid", request_id, agent_pubkey: pubkey, reason: "missing_prompt" });
    return err("missing_prompt", 400);
  }
  if (!isTaskType(task_type)) {
    log.warn({ event: "inference.body_invalid", request_id, agent_pubkey: pubkey, reason: "invalid_task_type" });
    return err("invalid_task_type", 400);
  }
  if (typeof nonce !== "string" || nonce.length === 0) {
    log.warn({ event: "inference.body_invalid", request_id, agent_pubkey: pubkey, reason: "missing_nonce" });
    return err("missing_nonce", 400);
  }
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    log.warn({ event: "inference.body_invalid", request_id, agent_pubkey: pubkey, reason: "invalid_timestamp" });
    return err("invalid_timestamp", 400);
  }

  const skewMs = Math.abs(Date.now() - timestamp);
  if (skewMs > TIMESTAMP_SKEW_MS) {
    log.warn({
      event: "inference.timestamp_skew",
      request_id,
      agent_pubkey: pubkey,
      skew_ms: skewMs,
    });
    return err("request_expired", 401, { skew_ms: skewMs });
  }

  const supabase = getServiceClient();

  await ensureAgent(supabase, pubkey);

  try {
    await recordNonce(supabase, pubkey, nonce);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      log.warn({
        event: "inference.nonce_replay",
        request_id,
        agent_pubkey: pubkey,
        nonce,
      });
      return err("nonce_replay", 409);
    }
    throw e;
  }

  // Wire 1 Phase A — the prepaid path also accrues a receipt fee on
  // top of the upstream cost. Compute the breakdown up front so the
  // balance gate covers the fee too. The "inference component" is
  // zero here because actual cost is unknown pre-call — the fee is
  // the only deterministic charge we can pre-check.
  const feeBreakdown = computeFeeBreakdown(0);
  const feeExempt = getFeeExemptPubkeys().has(pubkey);
  const minBalance = feeExempt
    ? MIN_BALANCE_USDC
    : MIN_BALANCE_USDC + feeBreakdown.receiptFeeUsdc;

  const balance = await getBalance(supabase, pubkey);
  if (balance < minBalance) {
    log.warn({
      event: "inference.balance_insufficient",
      request_id,
      agent_pubkey: pubkey,
      balance,
      required_usdc: minBalance,
    });
    return err("insufficient_credits", 402, { balance_usdc: balance });
  }

  const decision = route(task_type, max_cost_usdc);
  log.info({
    event: "inference.route_chosen",
    request_id,
    agent_pubkey: pubkey,
    provider: decision.provider,
    model: decision.model,
    upstream_model: decision.upstreamModel,
    task_type,
  });

  log.info({
    event: "inference.upstream_started",
    request_id,
    agent_pubkey: pubkey,
    upstream_model: decision.upstreamModel,
  });
  const tInference = Date.now();

  let result;
  try {
    result = await runInference({
      upstreamModel: decision.upstreamModel,
      prompt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error";
    log.error({
      event: "inference.upstream_failed",
      request_id,
      agent_pubkey: pubkey,
      upstream_model: decision.upstreamModel,
      latency_ms: Date.now() - tInference,
      reason: message,
    });
    await supabase.from("inference_logs").insert({
      agent_pubkey: pubkey,
      request_nonce: nonce,
      upstream: "openrouter",
      model: decision.upstreamModel,
      cost_usdc: 0,
      latency_ms: 0,
      status: "error",
      error: message,
      points: 0,
    });
    return err("upstream_error", 502, { detail: message });
  }

  log.info({
    event: "inference.upstream_ok",
    request_id,
    agent_pubkey: pubkey,
    upstream_model: decision.upstreamModel,
    cost_usdc: result.cost_usdc,
    latency_ms: result.latency_ms,
    prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
  });

  // Atomic balance check + debit. Concurrent requests for the same
  // agent serialize at the database level — no overdraft window.
  // Returns null when the upstream cost exceeded the live balance
  // (rare; only happens if the agent burned credits between the
  // probe and this point, e.g. another in-flight call).
  const newBalance = await tryDebit(supabase, {
    pubkey,
    usdc: result.cost_usdc,
    reason: "inference",
    nonce,
  });

  if (newBalance === null) {
    log.warn({
      event: "inference.debit_insufficient_post_inference",
      request_id,
      agent_pubkey: pubkey,
      cost_usdc: result.cost_usdc,
    });
    // The inference already ran (we paid OpenRouter upstream), but the
    // agent can't cover it. Log the row at status=error so the loss is
    // visible, but don't sign a receipt that promises the call succeeded.
    await supabase.from("inference_logs").insert({
      agent_pubkey: pubkey,
      request_nonce: nonce,
      upstream: result.upstream,
      model: decision.upstreamModel,
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      cost_usdc: result.cost_usdc,
      latency_ms: result.latency_ms,
      status: "error",
      error: "insufficient_credits_post_debit",
      points: 0,
    });
    return err("insufficient_credits", 402);
  }

  const { data: logRow } = await supabase
    .from("inference_logs")
    .insert({
      agent_pubkey: pubkey,
      request_nonce: nonce,
      upstream: result.upstream,
      model: decision.upstreamModel,
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      cost_usdc: result.cost_usdc,
      latency_ms: result.latency_ms,
      status: "success",
      points: 1,
    })
    .select("id")
    .single();

  log.info({
    event: "ledger.debited",
    request_id,
    agent_pubkey: pubkey,
    cost_usdc: result.cost_usdc,
    balance_remaining: newBalance,
  });

  // Wire 1 Phase A — debit the receipt fee and accrue it to the burn
  // pool. Skipped for fee-exempt agents (e.g. the playground sponsor)
  // so operator-funded probe traffic doesn't inflate the public burn
  // counter. Both writes are best-effort: a failure here is logged
  // but doesn't fail the user response, since the inference itself
  // has already run and been debited.
  if (!feeExempt && feeBreakdown.receiptFeeUsdc > 0) {
    try {
      await debit(supabase, {
        pubkey,
        usdc: feeBreakdown.receiptFeeUsdc,
        reason: "receipt_fee",
        nonce,
      });
    } catch (e) {
      log.error({
        event: "inference.fee_debit_failed",
        request_id,
        agent_pubkey: pubkey,
        fee_usdc: feeBreakdown.receiptFeeUsdc,
        detail: e instanceof Error ? e.message : "unknown",
      });
    }

    const burnResult = await recordBurnPoolFee(supabase, {
      agentPubkey: pubkey,
      breakdown: feeBreakdown,
      network: getPrepaidNetwork(),
      source: "inference",
      txSignature: null,
      inferenceId: logRow?.id ?? null,
    });
    if (burnResult.ok) {
      log.info({
        event: "burn_pool.recorded",
        request_id,
        agent_pubkey: pubkey,
        source: "inference",
        fee_usdc: feeBreakdown.receiptFeeUsdc,
        burn_pool_share_usdc: feeBreakdown.burnPoolShareUsdc,
        treasury_share_usdc: feeBreakdown.treasuryShareUsdc,
        inference_id: logRow?.id ?? null,
      });
    } else if (burnResult.replay) {
      log.warn({
        event: "burn_pool.replay",
        request_id,
        agent_pubkey: pubkey,
        inference_id: logRow?.id ?? null,
      });
    } else {
      log.error({
        event: "burn_pool.write_failed",
        request_id,
        agent_pubkey: pubkey,
        inference_id: logRow?.id ?? null,
        detail: burnResult.error.message,
      });
    }
  }

  const { points_total: pointsTotal } = await getAgentStats(supabase, pubkey);

  const receipt = signReceipt({
    v: 2 as const,
    agent_pubkey: pubkey,
    provider: decision.provider,
    model: decision.model,
    cost_usdc: result.cost_usdc,
    balance_remaining: newBalance,
    prompt_hash: sha256(prompt),
    response_hash: sha256(result.text),
    timestamp: Date.now(),
    inference_id: logRow?.id ?? null,
    points_total: pointsTotal,
  });

  // Persist the signed receipt onto the log row so public lookups at
  // /api/v1/receipts/<id> can return the canonical signed JSON without
  // re-signing on read. Fire-and-forget: a failure here doesn't roll back
  // the inference (the receipt is already in the response).
  if (logRow?.id) {
    const { error: updateError } = await supabase
      .from("inference_logs")
      .update({ receipt_json: receipt })
      .eq("id", logRow.id);
    if (updateError) {
      log.error({
        event: "receipt_persist_failed",
        request_id,
        agent_pubkey: pubkey,
        inference_id: logRow.id,
        detail: updateError.message,
      });
    }
  }

  log.info({
    event: "response.sent",
    request_id,
    agent_pubkey: pubkey,
    status: 200,
    total_latency_ms: Date.now() - t0,
  });

  return NextResponse.json(
    {
      ok: true,
      result: result.text,
      receipt,
    },
    {
      headers: {
        "X-RateLimit-Limit": String(pkDecision.limit),
        "X-RateLimit-Remaining": String(pkDecision.remaining),
        "X-RateLimit-Reset": String(pkDecision.reset),
      },
    }
  );
}
