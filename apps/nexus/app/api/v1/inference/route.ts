import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyRequestSignature, isValidPubkey } from "@/lib/solana";
import { debit, ensureAgent, getBalance } from "@/lib/credits";
import { runInference } from "@/lib/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBKEY_HEADER = "x-nexus-pubkey";
const SIG_HEADER = "x-nexus-signature";

type Body = {
  prompt?: string;
  model?: string;
  nonce?: string;
  timestamp?: string;
};

function err(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
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

  const { prompt, model, nonce, timestamp } = body;
  if (!prompt || typeof prompt !== "string") return err("missing_prompt", 400);
  if (!model || typeof model !== "string") return err("missing_model", 400);
  if (!nonce || typeof nonce !== "string") return err("missing_nonce", 400);
  if (!timestamp || typeof timestamp !== "string") {
    return err("missing_timestamp", 400);
  }

  const maxAgeSec = Number(process.env.NEXUS_REQUEST_MAX_AGE_SECONDS ?? 60);
  const sentAt = Date.parse(timestamp);
  if (!Number.isFinite(sentAt)) return err("invalid_timestamp", 400);
  const skewMs = Math.abs(Date.now() - sentAt);
  if (skewMs > maxAgeSec * 1000) {
    return err("request_expired", 401, { skew_ms: skewMs });
  }

  const supabase = getServiceClient();

  await ensureAgent(supabase, pubkey);

  const balance = await getBalance(supabase, pubkey);
  if (balance <= 0) {
    return err("insufficient_credits", 402, { balance_usdc: balance });
  }

  let result;
  try {
    result = await runInference({ prompt, model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error";
    await supabase.from("inference_logs").insert({
      agent_pubkey: pubkey,
      request_nonce: nonce,
      upstream: "openrouter",
      model,
      cost_usdc: 0,
      latency_ms: 0,
      status: "error",
      error: message,
    });
    return err("upstream_error", 502, { detail: message });
  }

  try {
    await debit(supabase, {
      pubkey,
      usdc: result.cost_usdc,
      reason: "inference",
      nonce,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") {
      return err("nonce_replay", 409);
    }
    throw e;
  }

  await supabase.from("inference_logs").insert({
    agent_pubkey: pubkey,
    request_nonce: nonce,
    upstream: result.upstream,
    model: result.model,
    prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    cost_usdc: result.cost_usdc,
    latency_ms: result.latency_ms,
    status: "success",
  });

  const newBalance = await getBalance(supabase, pubkey);

  return NextResponse.json({
    ok: true,
    text: result.text,
    model: result.model,
    usage: {
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      cost_usdc: result.cost_usdc,
      latency_ms: result.latency_ms,
    },
    balance_usdc: newBalance,
  });
}
