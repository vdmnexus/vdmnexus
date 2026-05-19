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
  agent_pubkey: string;
  upstream: string;
  model: string;
  cost_usdc: number;
  prompt_hash: string;
  response_hash: string;
  timestamp: number;
  inference_id: number | null;
  payment: {
    scheme: "x402";
    amount_usdc: number;
    tx_signature: string;
    network: string;
  };
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
