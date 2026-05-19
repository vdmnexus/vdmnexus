import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceClient } from "@/lib/supabase";
import { credit, debit, ensureAgent } from "@/lib/credits";
import { runChatInference, type ChatMessage } from "@/lib/chat-inference";
import { getFacilitator } from "@/lib/x402-facilitator";
import {
  X402_PAYMENT_HEADER,
  X402_REQUIRED_HEADER,
  X402_RESPONSE_HEADER,
  X402_NETWORKS,
  buildChallenge,
  decodeHeader,
  encodeHeader,
  extractPayerFromPayload,
  type X402PaymentPayload,
  type X402Network,
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

function getNetwork(): X402Network {
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

  const paymentHeader = req.headers.get(X402_PAYMENT_HEADER);

  if (!paymentHeader) {
    const challenge = buildChallenge({
      amountUsdc,
      payTo: recipient,
      network,
    });
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

  const payload = decodeHeader<X402PaymentPayload>(paymentHeader);
  if (!payload) {
    return err("payment_malformed", 402, {
      detail: "X-PAYMENT header is not valid base64 JSON",
    });
  }

  const challenge = buildChallenge({
    amountUsdc,
    payTo: recipient,
    network,
  });
  const requirement = challenge.accepts[0];

  const facilitator = getFacilitator();
  const verified = await facilitator.verify(payload, requirement);
  if (!verified.ok) {
    return err("payment_invalid", 402, { detail: verified.error });
  }
  const settled = await facilitator.settle(payload, requirement);
  if (!settled.ok) {
    return err("payment_failed", 402, { detail: settled.error });
  }

  const payerWallet = extractPayerFromPayload(payload);
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
      tx_signature: settled.txSignature,
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
    await supabase.from("inference_logs").insert({
      agent_pubkey: payerWallet,
      upstream: "openrouter",
      model: body.model,
      cost_usdc: 0,
      latency_ms: 0,
      status: "error",
      error: message,
    });
    return err("upstream_error", 502, { detail: message });
  }

  await debit(supabase, {
    pubkey: payerWallet,
    usdc: result.cost_usdc,
    reason: "inference",
  });

  const { data: logRow } = await supabase
    .from("inference_logs")
    .insert({
      agent_pubkey: payerWallet,
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

  const promptForHash = body.messages.map((m) => `${m.role}:${m.content}`).join("\n");
  const responseText = result.openaiResponse.choices[0]?.message.content ?? "";

  const receipt = {
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
      tx_signature: settled.txSignature,
      network,
    },
  };

  return new NextResponse(JSON.stringify(result.openaiResponse), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-nexus-receipt": encodeHeader(receipt),
      [X402_RESPONSE_HEADER]: encodeHeader({
        status: "settled",
        txSignature: settled.txSignature,
        network,
      }),
    },
  });
}
