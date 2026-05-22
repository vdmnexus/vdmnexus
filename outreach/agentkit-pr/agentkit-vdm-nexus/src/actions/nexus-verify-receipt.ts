/**
 * `nexus_verify_receipt` action — run the SIR v2 five-check verifier.
 *
 * Delegates to `verifyReceipt` from `@vdm-nexus/x402`. The action takes the
 * original prompt + response (so hash checks can recompute) and returns the
 * five boolean checks. Network selection (which RPC to hit for the
 * on-chain lookup) is derived from the receipt's `payment.network` field —
 * the verifier supports Solana (`solana:…`) and Base (`eip155:8453`,
 * `eip155:84532`) automatically.
 *
 * See https://docs.vdmnexus.com/docs/spec/sir-v2 for the canonical
 * verification spec.
 */

import { z } from "zod";
import {
  verifyReceipt,
  type NexusReceipt,
  type ChatMessage,
  type OpenAIChatCompletion,
} from "@vdm-nexus/x402";

export const NexusVerifyReceiptSchema = z
  .object({
    receipt: z
      .unknown()
      .describe(
        "The Signed Inference Receipt (SIR v2) to verify, as returned by `nexus_chat` in the `receipt` field.",
      ),
    prompt: z
      .union([
        z.string(),
        z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          }),
        ),
      ])
      .describe(
        "The prompt the receipt covers. For x402 chat-completion receipts, pass the `messages` array you sent. For prepaid receipts, pass the raw prompt string.",
      ),
    response: z
      .union([z.string(), z.unknown()])
      .describe(
        "The response the receipt covers. For x402 chat-completion receipts, pass the OpenAI response body. For prepaid receipts, pass the raw response string.",
      ),
    endpoint: z
      .string()
      .optional()
      .describe(
        "Optional Nexus base URL (e.g. https://nexus.vdmnexus.com). Used to fetch the operator public key if `operatorKey` is not supplied.",
      ),
    operatorKey: z
      .string()
      .optional()
      .describe(
        "Optional base58 Ed25519 operator public key. If omitted, fetched from `${endpoint}/api/v1/operator-key`.",
      ),
    rpc: z
      .string()
      .optional()
      .describe(
        "Optional RPC URL override for the on-chain check. Defaults derived from `receipt.payment.network`.",
      ),
  })
  .describe(
    "Run the five-check SIR v2 verification: prompt_hash_ok, response_hash_ok, " +
      "nexus_signature_ok, payment_on_chain_ok, payer_matches. Returns the full " +
      "check breakdown so the agent can act on partial failures.",
  );

export async function executeNexusVerifyReceipt(
  defaultEndpoint: string,
  defaultOperatorKey: string | undefined,
  args: z.infer<typeof NexusVerifyReceiptSchema>,
): Promise<string> {
  try {
    const result = await verifyReceipt({
      receipt: args.receipt as NexusReceipt,
      prompt: args.prompt as ChatMessage[] | string,
      response: args.response as OpenAIChatCompletion | string,
      endpoint: args.endpoint ?? defaultEndpoint,
      operatorKey: args.operatorKey ?? defaultOperatorKey,
      rpc: args.rpc,
    });
    return JSON.stringify({
      ok: result.ok,
      checks: result.checks,
    });
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: "verify_failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
