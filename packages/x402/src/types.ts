/**
 * Public types for `@vdm-nexus/x402`. Re-export everything callers need from
 * `@x402/core` so they don't have to install it directly.
 */

export type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
  SettleResponse,
  VerifyResponse,
} from "@x402/core/types";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type X402ChatRequest = {
  /** OpenRouter model slug (e.g. "openai/gpt-4o-mini"). */
  model: string;
  messages: ChatMessage[];
};

export type OpenAIChatCompletion = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type NexusReceipt = {
  /** Receipt schema version. Present (=== 2) on signed receipts. */
  v?: 2;
  agent_pubkey: string;
  upstream: string;
  model: string;
  cost_usdc: number;
  prompt_hash: string;
  response_hash: string;
  timestamp: number;
  inference_id: number | null;
  /** Total accumulated points for this agent_pubkey across all successful
   * inference calls, including the one this receipt is for. Currently we
   * award one point per successful call. Signed (part of the canonical
   * body) but not cryptographically verified by `verifyReceipt`. */
  points_total: number;
  payment: {
    scheme: "x402";
    amount_usdc: number;
    tx_signature: string;
    network: string;
    /** Recipient address that received the USDC. Present on v=2 receipts. */
    pay_to?: string;
  };
  /** Base58-encoded Ed25519 signature over the canonical JSON of the
   * receipt object with `nexus_signature` field excluded. v=2 only. */
  nexus_signature?: string;
};

export type X402PaymentResponse = {
  status: "settled";
  txSignature: string;
  network: string;
};

export type X402ChatResponse = {
  openai: OpenAIChatCompletion;
  receipt: NexusReceipt | null;
  payment: X402PaymentResponse | null;
};
