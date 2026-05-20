import type { Network } from "@x402/core/types";
import type { FacilitatorOption } from "./facilitator.js";
import type { NetworkAlias } from "./challenge.js";

export type PaywallLogger = {
  info: (fields: Record<string, unknown>) => void;
  warn: (fields: Record<string, unknown>) => void;
  error: (fields: Record<string, unknown>) => void;
};

export type PaidContext = {
  /** Base58 Solana wallet (= Ed25519 pubkey) of the payer. Agent identity. */
  payer: string;
  /** Settled on-chain tx signature, or `MOCK_<uuid>` under the mock facilitator. */
  txSignature: string;
  /** Amount actually charged after any `tokenDiscountBps` discount. */
  amount_usdc: number;
  /** Parsed request body the adapter handed to the paywall. Adapter-agnostic. */
  body: unknown;
  /** Lower-cased request headers. */
  headers: Record<string, string>;
  /** Multiplier surfaced by `stakingMultiplier`, or 1 if not configured. */
  staking_multiplier: number;
};

export type PaidResult = {
  /** Whatever you want in the HTTP response body (kept as `unknown` so the
   *  paywall stays agnostic about your handler's shape — OpenAI, JSON-RPC,
   *  plain object, anything). */
  response: unknown;
  /** SHA-256'd into `receipt.prompt_hash`. Hash what was actually charged for. */
  promptForHash: string;
  /** SHA-256'd into `receipt.response_hash`. */
  responseForHash: string;
  /** Required — the receipt always names what produced the response. */
  model: string;
  /** Provider/upstream tag for the receipt's `upstream` field. */
  upstream?: string;
  /** Real upstream cost in USD. Defaults to the paywall `amount` if omitted. */
  cost_usdc?: number;
  /** Extra fields merged into the signed receipt verbatim. Paywall-controlled
   *  fields (v, agent_pubkey, payment, …) override these on conflict. */
  extra?: Record<string, unknown>;
};

export type PaywallConfig = {
  amount: number;
  recipient: string;
  network: Network | NetworkAlias | string;

  /** 64-byte tweetnacl secretKey (base58). The Ed25519 key that signs every
   *  receipt this paywall emits. Publish the matching pubkey somewhere
   *  verifiers can reach (e.g. `/operator-key` like Nexus does). */
  operatorSecretKey: string;

  facilitator: FacilitatorOption;

  onPaid: (ctx: PaidContext) => Promise<PaidResult>;

  /** Per-call ceiling. The paywall fails-closed at construction if
   *  `amount > maxCostUsdc`. Default 0.10 USDC. */
  maxCostUsdc?: number;

  /** Called *before* settlement; returning `true` short-circuits the
   *  payment with 429 `loop_detected`, sparing the agent a wasted transfer. */
  loopDetection?: (payer: string, body: unknown) => Promise<boolean> | boolean;

  /** When set, payers outside the set get 403 `agent_not_allowed`. */
  allowedPayers?: ReadonlySet<string>;

  /** Bps (1/10000) discount given to `payer` — 500 → 5% off. Called once
   *  per challenge. Pre-payment the payer is unknown (claim comes from the
   *  X-Payment header), so the discount runs *after* we see a payment
   *  attempt and is checked against the discounted amount at verify-time. */
  tokenDiscountBps?: (payer: string | null) => Promise<number> | number;

  /** Bps cashback owed back to `payer` after a successful settlement.
   *  The paywall just emits a structured `paywall.cashback_owed` log line;
   *  payouts batched off-band by the operator. */
  cashbackBps?: number;
  cashbackEnabled?: boolean;

  /** Returns a staking-tier multiplier (e.g. 1.5x rewards). Surfaced to
   *  `onPaid` via `PaidContext.staking_multiplier`. Paywall does nothing
   *  with the number itself — your handler decides what to amplify. */
  stakingMultiplier?: (payer: string) => Promise<number> | number;

  logger?: PaywallLogger;

  resource?: {
    url?: string;
    description?: string;
    serviceName?: string;
  };
};

export type PaywallResult =
  | {
      kind: "challenge";
      status: 402;
      headers: Record<string, string>;
      body: Record<string, unknown>;
    }
  | {
      kind: "paid";
      status: 200;
      headers: Record<string, string>;
      body: unknown;
    }
  | {
      kind: "error";
      status: number;
      headers: Record<string, string>;
      body: Record<string, unknown>;
    };

export type PaywallRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
};
