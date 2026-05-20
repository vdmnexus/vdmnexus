import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { verifyRequestSignature, isValidPubkey } from "@/lib/solana";
import { debit, ensureAgent, getBalance } from "@/lib/credits";
import { runInference } from "@/lib/inference";
import { isTaskType, route, type TaskType } from "@/lib/routing";
import { recordNonce } from "@/lib/nonces";
import { signReceipt } from "@/lib/receipts";
import { getAgentStats } from "@/lib/points";
import { log, newRequestId } from "@/lib/log";
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

  const balance = await getBalance(supabase, pubkey);
  if (balance < MIN_BALANCE_USDC) {
    log.warn({
      event: "inference.balance_insufficient",
      request_id,
      agent_pubkey: pubkey,
      balance,
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

  await debit(supabase, {
    pubkey,
    usdc: result.cost_usdc,
    reason: "inference",
    nonce,
  });

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

  const newBalance = await getBalance(supabase, pubkey);

  log.info({
    event: "ledger.debited",
    request_id,
    agent_pubkey: pubkey,
    cost_usdc: result.cost_usdc,
    balance_remaining: newBalance,
  });

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
