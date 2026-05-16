import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { verifyRequestSignature, isValidPubkey } from "@/lib/solana";
import { debit, ensureAgent, getBalance } from "@/lib/credits";
import { runInference } from "@/lib/inference";
import { isTaskType, route, type TaskType } from "@/lib/routing";
import { recordNonce } from "@/lib/nonces";

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

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const pubkey = req.headers.get(PUBKEY_HEADER);
  const signature = req.headers.get(SIG_HEADER);

  if (!pubkey || !signature) {
    return err("missing_auth_headers", 401);
  }
  if (!isValidPubkey(pubkey)) {
    return err("invalid_pubkey", 401);
  }

  const raw = await req.text();
  if (!verifyRequestSignature(raw, signature, pubkey)) {
    return err("invalid_signature", 401);
  }

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return err("invalid_json", 400);
  }

  const { prompt, task_type, nonce, timestamp, max_cost_usdc } = body;
  if (typeof prompt !== "string" || prompt.length === 0) {
    return err("missing_prompt", 400);
  }
  if (!isTaskType(task_type)) return err("invalid_task_type", 400);
  if (typeof nonce !== "string" || nonce.length === 0) {
    return err("missing_nonce", 400);
  }
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return err("invalid_timestamp", 400);
  }

  const skewMs = Math.abs(Date.now() - timestamp);
  if (skewMs > TIMESTAMP_SKEW_MS) {
    return err("request_expired", 401, { skew_ms: skewMs });
  }

  const supabase = getServiceClient();

  await ensureAgent(supabase, pubkey);

  try {
    await recordNonce(supabase, pubkey, nonce);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return err("nonce_replay", 409);
    }
    throw e;
  }

  const balance = await getBalance(supabase, pubkey);
  if (balance < MIN_BALANCE_USDC) {
    return err("insufficient_credits", 402, { balance_usdc: balance });
  }

  const decision = route(task_type, max_cost_usdc);

  let result;
  try {
    result = await runInference({
      upstreamModel: decision.upstreamModel,
      prompt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error";
    await supabase.from("inference_logs").insert({
      agent_pubkey: pubkey,
      request_nonce: nonce,
      upstream: "openrouter",
      model: decision.upstreamModel,
      cost_usdc: 0,
      latency_ms: 0,
      status: "error",
      error: message,
    });
    return err("upstream_error", 502, { detail: message });
  }

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
    })
    .select("id")
    .single();

  const newBalance = await getBalance(supabase, pubkey);

  return NextResponse.json({
    ok: true,
    result: result.text,
    receipt: {
      agent_pubkey: pubkey,
      provider: decision.provider,
      model: decision.model,
      cost_usdc: result.cost_usdc,
      balance_remaining: newBalance,
      prompt_hash: sha256(prompt),
      response_hash: sha256(result.text),
      timestamp: Date.now(),
      inference_id: logRow?.id ?? null,
    },
  });
}
