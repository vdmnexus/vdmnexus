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
  /**
   * Optional per-call network override.
   *
   * Accepted aliases: `"devnet"`, `"mainnet"`, `"solana-devnet"`,
   * `"solana-mainnet"`, `"solana:devnet"`, `"solana:mainnet"`, `"base"`,
   * `"base-mainnet"`, `"base-sepolia"`, `"eip155:8453"`, `"eip155:84532"`.
   *
   * Omit to use the server's `X402_NETWORK` default. This is how an agent
   * opts into mainnet from an endpoint whose default is still devnet —
   * the per-call network selector is the whole point of the multi-chain
   * rail.
   */
  network?: string;
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

/**
 * Fields common to every Signed Inference Receipt (SIR) wire format v2,
 * regardless of settlement model.
 *
 * The two variants (`SirPrepaid`, `SirX402`) extend this with the fields
 * specific to their settlement path. The full receipt type is
 * `NexusReceipt = SirPrepaid | SirX402`, discriminated by presence of the
 * `payment` field.
 *
 * See the spec: https://docs.vdmnexus.com/docs/spec/sir-v2
 */
export type SirCommon = {
  /** Receipt schema version. Always 2 on signed receipts. */
  v: 2;
  /** Base58 Ed25519 public key (= Solana wallet address) of the agent. */
  agent_pubkey: string;
  /** Model identifier as routed by the operator. */
  model: string;
  /** Actual upstream cost the operator paid (USD). NOT operator-charged. */
  cost_usdc: number;
  /** SHA256 hex of the prompt. Format depends on variant — see spec §10. */
  prompt_hash: string;
  /** SHA256 hex of the response text. Format depends on variant — see spec §10. */
  response_hash: string;
  /** Server wall-clock at receipt construction, ms since epoch. */
  timestamp: number;
  /** Operator-side database row id, or null if the row write failed. */
  inference_id: number | null;
  /** Cumulative points attributed to this agent_pubkey including this call.
   * Operator-asserted, NOT cryptographically verifiable against external state. */
  points_total: number;
  /** Base58-encoded Ed25519 signature by the operator key over the canonical
   * JSON of this object with `nexus_signature` excluded.
   * See `getOperatorPublicKey()` and spec §9. */
  nexus_signature: string;
};

/**
 * Signed Inference Receipt — Prepaid variant.
 *
 * Issued by an operator-credit settlement path (e.g. `/api/v1/inference`)
 * where the agent's balance is debited against a pre-funded ledger.
 * No on-chain transaction is anchored to this receipt; verifier checks
 * 4 (payment_on_chain_ok) and 5 (payer_matches) are vacuously true.
 */
export type SirPrepaid = SirCommon & {
  /** Routing decision tag (e.g. "openrouter:fast"). Operator-defined. */
  provider: string;
  /** Operator-credit balance remaining after this debit (USD). */
  balance_remaining: number;
  payment?: never;
  upstream?: never;
};

/**
 * Signed Inference Receipt — x402 variant.
 *
 * Issued when settlement happens per-call via an x402 payment on a
 * blockchain (e.g. `/api/v1/chat/completions`). The `payment` sub-object
 * anchors the verifier to an on-chain transaction.
 */
export type SirX402 = SirCommon & {
  /** Inference provider name (e.g. "openrouter"). */
  upstream: string;
  payment: {
    /** Payment scheme identifier — always "x402" on this variant. */
    scheme: "x402";
    /** Amount paid by the agent (USD). Anchored to on-chain delta. */
    amount_usdc: number;
    /** Blockchain transaction signature (base58 on Solana). */
    tx_signature: string;
    /** CAIP-2 network identifier. Genesis-hash form is spec-compliant. */
    network: string;
    /** Recipient address that received the USDC. Required on v=2. */
    pay_to: string;
  };
  balance_remaining?: never;
};

/**
 * Signed Inference Receipt (SIR) — wire format v2.
 *
 * Discriminated union: presence of the `payment` field selects the variant.
 *
 *   if (receipt.payment) { /* SirX402 *\/ }
 *   else                  { /* SirPrepaid *\/ }
 */
export type NexusReceipt = SirPrepaid | SirX402;

/** Canonical alias for `NexusReceipt`. Use this in new code. */
export type SignedInferenceReceipt = NexusReceipt;

export type X402PaymentResponse = {
  status: "settled";
  txSignature: string;
  network: string;
};

export type X402ChatResponse = {
  openai: OpenAIChatCompletion;
  /** Chat-completion receipts are always the x402 variant. */
  receipt: SirX402 | null;
  payment: X402PaymentResponse | null;
};
