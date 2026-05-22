/**
 * `nexus_chat` action — pay-per-call signed inference via x402.
 *
 * Performs the standard x402 two-roundtrip handshake against a Nexus
 * `/chat/completions` endpoint, paid in USDC from the AgentKit-managed
 * wallet's Solana keypair, and returns the OpenAI response plus the
 * SIR v2 signed receipt.
 *
 * Mirrors `X402Agent.payAndInfer` from `@vdm-nexus/x402`, but drives the
 * signing path through `SvmWalletProvider.getKeyPairSigner()` so no
 * separate `AGENT_SECRET_KEY` env var is required — the wallet is the
 * identity.
 */

import { z } from "zod";
import type { SvmWalletProvider } from "@coinbase/agentkit";
import { x402Client } from "@x402/core/client";
import type {
  PaymentPayload,
  PaymentRequired,
} from "@x402/core/types";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import type {
  NexusReceipt,
  OpenAIChatCompletion,
  X402PaymentResponse,
} from "@vdm-nexus/x402";

const PAYMENT_HEADER = "x-payment";
const PAYMENT_REQUIRED_HEADER = "x-payment-required";
const PAYMENT_RESPONSE_HEADER = "x-payment-response";
const RECEIPT_HEADER = "x-nexus-receipt";

/**
 * Schema for the `nexus_chat` action.
 *
 * `messages` and `model` are the OpenAI-shape inputs; `network` is an
 * optional per-call override that lets a single agent target multiple
 * settlement chains (Solana mainnet vs. devnet vs. Base) without
 * reconfiguring the provider.
 */
export const NexusChatSchema = z
  .object({
    model: z
      .string()
      .describe(
        'OpenRouter-style model slug (e.g. "openai/gpt-4o-mini", "anthropic/claude-3-haiku").',
      ),
    messages: z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        }),
      )
      .min(1)
      .describe("OpenAI-shape chat messages array."),
    network: z
      .string()
      .optional()
      .describe(
        'Optional CAIP-2 settlement network override (e.g. "solana:mainnet", "solana:devnet", "eip155:8453"). Omit to use the server default.',
      ),
  })
  .describe(
    "Pay-per-call signed inference against a VDM Nexus endpoint. " +
      "Returns the OpenAI chat completion plus a Signed Inference Receipt (SIR v2) " +
      "that anchors the inference to an on-chain USDC payment.",
  );

function decodeHeader<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function encodeHeader(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

export type NexusChatResult = {
  ok: true;
  openai: OpenAIChatCompletion;
  receipt: NexusReceipt | null;
  payment: X402PaymentResponse | null;
};

/**
 * Run the x402 handshake and inference call.
 *
 * @param endpoint - Nexus base URL up to `/api/v1` (no trailing slash needed).
 * @param walletProvider - AgentKit-managed Solana wallet. The keypair signs
 *   the SPL USDC transfer in the x402 payment payload.
 * @param args - Validated `NexusChatSchema` arguments.
 * @returns Stringified result suitable for an LLM tool response. The shape
 *   is JSON so downstream agents can parse the receipt programmatically.
 */
export async function executeNexusChat(
  endpoint: string,
  walletProvider: SvmWalletProvider,
  args: z.infer<typeof NexusChatSchema>,
): Promise<string> {
  const base = endpoint.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const requestBody = JSON.stringify({
    model: args.model,
    messages: args.messages,
    ...(args.network ? { network: args.network } : {}),
  });

  // 1. Probe — unpaid POST returns 402 with the x402 challenge.
  const probe = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  });

  if (probe.status !== 402) {
    const text = await probe.text();
    return JSON.stringify({
      ok: false,
      error: "x402_probe_failed",
      detail: `expected 402, got ${probe.status}: ${text.slice(0, 200)}`,
    });
  }

  const challenge =
    decodeHeader<PaymentRequired>(probe.headers.get(PAYMENT_REQUIRED_HEADER)) ??
    (await (async () => {
      try {
        const body = (await probe.json()) as { challenge?: PaymentRequired };
        return body.challenge ?? null;
      } catch {
        return null;
      }
    })());
  if (!challenge) {
    return JSON.stringify({
      ok: false,
      error: "x402_missing_challenge",
      detail: "402 response had no X-Payment-Required header or body challenge",
    });
  }

  // 2. Drive the x402 client off the AgentKit-managed Solana wallet.
  const kitSigner = await walletProvider.getKeyPairSigner();
  const signer = toClientSvmSigner(kitSigner);
  const client = new x402Client();
  registerExactSvmScheme(client, { signer });
  const payment: PaymentPayload = await client.createPaymentPayload(challenge);

  // 3. Paid retry — facilitator settles, route runs inference, response
  //    carries the signed receipt.
  const paid = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [PAYMENT_HEADER]: encodeHeader(payment),
    },
    body: requestBody,
  });

  if (paid.status === 409) {
    return JSON.stringify({
      ok: false,
      error: "x402_payment_replay",
      detail:
        "this tx_signature was already credited — re-issue the request to get a fresh challenge",
    });
  }
  if (!paid.ok) {
    const errBody = (await paid.json().catch(() => ({}))) as {
      detail?: string;
    };
    return JSON.stringify({
      ok: false,
      error: "x402_upstream_error",
      status: paid.status,
      detail: errBody.detail ?? `HTTP ${paid.status}`,
    });
  }

  const openai = (await paid.json()) as OpenAIChatCompletion;
  const receipt = decodeHeader<NexusReceipt>(paid.headers.get(RECEIPT_HEADER));
  const payment_response = decodeHeader<X402PaymentResponse>(
    paid.headers.get(PAYMENT_RESPONSE_HEADER),
  );

  const result: NexusChatResult = {
    ok: true,
    openai,
    receipt,
    payment: payment_response,
  };
  return JSON.stringify(result);
}
