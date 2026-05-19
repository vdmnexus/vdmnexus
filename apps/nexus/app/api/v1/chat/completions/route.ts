import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { credit, debit, ensureAgent } from "@/lib/credits";
import { runChatInference, type ChatMessage } from "@/lib/chat-inference";
import { signReceipt } from "@/lib/receipts";
import {
  getFacilitator,
  FacilitatorNotConfiguredError,
} from "@/lib/x402-facilitator";
import {
  X402_PAYMENT_HEADER,
  X402_REQUIRED_HEADER,
  X402_RESPONSE_HEADER,
  X402_NETWORKS,
  buildChallenge,
  decodeHeader,
  encodeHeader,
  extractPayerFromPayload,
  type Network,
  type PaymentPayload,
  type ResourceInfo,
} from "@/lib/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatCompletionsBody = {
  model?: string;
  messages?: ChatMessage[];
  stream?: boolean;
};

function err(
  error: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function getNetwork(): Network {
  const env = process.env.X402_NETWORK?.trim();
  if (env === X402_NETWORKS.solanaMainnet) return X402_NETWORKS.solanaMainnet;
  return X402_NETWORKS.solanaDevnet;
}

function getFlatPriceUsdc(): number {
  const raw = process.env.X402_FLAT_PRICE_USDC;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0.01;
}

function getRecipient(): string | null {
  return (
    process.env.X402_RECIPIENT_ADDRESS?.trim() ||
    process.env.NEXUS_DEPOSIT_ADDRESS?.trim() ||
    null
  );
}

function getResource(req: NextRequest): ResourceInfo {
  return {
    url: new URL("/api/v1/chat/completions", req.nextUrl.origin).toString(),
    description: "OpenAI-compatible chat completions, paid per call in USDC.",
    serviceName: "VDM Nexus",
    mimeType: "application/json",
  };
}

function isValidBody(b: ChatCompletionsBody): b is Required<
  Pick<ChatCompletionsBody, "model" | "messages">
> &
  ChatCompletionsBody {
  if (typeof b.model !== "string" || b.model.length === 0) return false;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return false;
  for (const m of b.messages) {
    if (
      typeof m !== "object" ||
      m === null ||
      typeof (m as ChatMessage).role !== "string" ||
      typeof (m as ChatMessage).content !== "string"
    ) {
      return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  let body: ChatCompletionsBody;
  try {
    body = (await req.json()) as ChatCompletionsBody;
  } catch {
    return err("invalid_json", 400);
  }

  if (!isValidBody(body)) {
    return err("invalid_request", 400, {
      detail: "model + messages[] (each with role + content) required",
    });
  }

  if (body.stream) {
    return err("streaming_not_supported", 400, {
      detail: "set stream=false; streaming arrives in a future release",
    });
  }

  const recipient = getRecipient();
  if (!recipient) {
    return err("server_misconfigured", 500, {
      detail: "X402_RECIPIENT_ADDRESS or NEXUS_DEPOSIT_ADDRESS must be set",
    });
  }

  const amountUsdc = getFlatPriceUsdc();
  const network = getNetwork();
  const resource = getResource(req);

  const challenge = buildChallenge({
    amountUsdc,
    payTo: recipient,
    network,
    resource,
  });
  const requirement = challenge.accepts[0];
  if (!requirement) {
    return err("server_misconfigured", 500, { detail: "no payment option" });
  }

  const paymentHeader = req.headers.get(X402_PAYMENT_HEADER);

  if (!paymentHeader) {
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "payment_required",
        challenge,
      }),
      {
        status: 402,
        headers: {
          "content-type": "application/json",
          [X402_REQUIRED_HEADER]: encodeHeader(challenge),
        },
      }
    );
  }

  const payload = decodeHeader<PaymentPayload>(paymentHeader);
  if (!payload) {
    return err("payment_malformed", 402, {
      detail: "X-PAYMENT header is not valid base64 JSON",
    });
  }

  let facilitator;
  try {
    facilitator = await getFacilitator();
  } catch (e) {
    if (e instanceof FacilitatorNotConfiguredError) {
      return err("server_misconfigured", 500, { detail: e.message });
    }
    return err("facilitator_init_failed", 500, {
      detail: e instanceof Error ? e.message : "unknown",
    });
  }
  let verified;
  try {
    verified = await facilitator.verify(payload, requirement);
  } catch (e) {
    return err("facilitator_unreachable", 502, {
      detail: e instanceof Error ? e.message : "verify_threw",
    });
  }
  if (!verified.isValid) {
    return err("payment_invalid", 402, {
      detail: verified.invalidReason ?? verified.invalidMessage ?? "invalid",
    });
  }

  let settled;
  try {
    settled = await facilitator.settle(payload, requirement);
  } catch (e) {
    return err("facilitator_unreachable", 502, {
      detail: e instanceof Error ? e.message : "settle_threw",
    });
  }
  if (!settled.success) {
    return err("payment_failed", 402, {
      detail: settled.errorReason ?? settled.errorMessage ?? "failed",
    });
  }

  const payerWallet =
    settled.payer ?? verified.payer ?? extractPayerFromPayload(payload);
  if (!payerWallet) {
    return err("payment_missing_payer", 402);
  }

  const supabase = getServiceClient();
  await ensureAgent(supabase, payerWallet);

  try {
    await credit(supabase, {
      pubkey: payerWallet,
      usdc: amountUsdc,
      reason: "x402_payment",
      tx_signature: settled.transaction,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return err("payment_replay", 409);
    }
    throw e;
  }

  let result;
  try {
    result = await runChatInference({
      upstreamModel: body.model,
      messages: body.messages,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error";
    const { error: logError } = await supabase.from("inference_logs").insert({
      agent_pubkey: payerWallet,
      request_nonce: settled.transaction,
      upstream: "openrouter",
      model: body.model,
      cost_usdc: 0,
      latency_ms: 0,
      status: "error",
      error: message,
    });
    if (logError) {
      console.error("inference_logs (error row) insert failed", {
        tx: settled.transaction,
        error: logError,
      });
    }
    return err("upstream_error", 502, { detail: message });
  }

  await debit(supabase, {
    pubkey: payerWallet,
    usdc: result.cost_usdc,
    reason: "inference",
  });

  const { data: logRow, error: logError } = await supabase
    .from("inference_logs")
    .insert({
      agent_pubkey: payerWallet,
      request_nonce: settled.transaction,
      upstream: result.upstream,
      model: body.model,
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      cost_usdc: result.cost_usdc,
      latency_ms: result.latency_ms,
      status: "success",
    })
    .select("id")
    .single();
  if (logError) {
    console.error("inference_logs insert failed", {
      tx: settled.transaction,
      error: logError,
    });
  }

  const promptForHash = body.messages
    .map((m) => `${m.role}:${m.content}`)
    .join("\n");
  const responseText = result.openaiResponse.choices[0]?.message.content ?? "";

  const receipt = signReceipt({
    v: 2 as const,
    agent_pubkey: payerWallet,
    upstream: result.upstream,
    model: body.model,
    cost_usdc: result.cost_usdc,
    prompt_hash: sha256(promptForHash),
    response_hash: sha256(responseText),
    timestamp: Date.now(),
    inference_id: logRow?.id ?? null,
    payment: {
      scheme: "x402",
      amount_usdc: amountUsdc,
      tx_signature: settled.transaction,
      network,
      pay_to: recipient,
    },
  });

  return new NextResponse(JSON.stringify(result.openaiResponse), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-nexus-receipt": encodeHeader(receipt),
      [X402_RESPONSE_HEADER]: encodeHeader({
        status: "settled",
        txSignature: settled.transaction,
        network,
      }),
    },
  });
}
