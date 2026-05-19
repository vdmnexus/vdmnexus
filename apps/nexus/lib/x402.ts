/**
 * x402 — protocol types, header constants, and wire-format codec.
 *
 * The spec is moving fast; keep header names + payload shapes behind these
 * constants so we can swap to v2 naming (no X- prefix) with one edit.
 *
 * Reference: https://github.com/coinbase/x402
 */

export const X402_VERSION = "0.4";

export const X402_PAYMENT_HEADER = "x-payment";
export const X402_REQUIRED_HEADER = "x-payment-required";
export const X402_RESPONSE_HEADER = "x-payment-response";

export const X402_NETWORKS = {
  solanaDevnet: "solana-devnet",
  solanaMainnet: "solana-mainnet",
} as const;
export type X402Network = (typeof X402_NETWORKS)[keyof typeof X402_NETWORKS];

/** Devnet USDC mint (Circle's official devnet token). */
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/**
 * Payment option declared in the 402 challenge. Matches the x402 v0.4 spec's
 * `accepts[]` entry shape.
 */
export type X402PaymentOption = {
  scheme: "exact";
  network: X402Network;
  asset: string;
  amountAtomic: string;
  payTo: string;
  maxTimeoutSeconds?: number;
};

export type X402Challenge = {
  x402Version: string;
  accepts: X402PaymentOption[];
};

/**
 * Payment payload — what the client sends back in the X-PAYMENT header.
 * For Solana the `authorization` carries a partially-signed SPL transfer tx
 * encoded as base64. The facilitator co-signs (fee payer) and broadcasts.
 */
export type X402SolanaAuthorization = {
  /** Base64-encoded partially-signed Solana transaction. */
  transaction: string;
  /** Payer wallet (first signer) — base58. Server uses this as identity. */
  payer: string;
};

export type X402PaymentPayload = {
  x402Version: string;
  scheme: "exact";
  network: X402Network;
  authorization: X402SolanaAuthorization;
};

export type X402SettlementResult = {
  status: "settled";
  txSignature: string;
  network: X402Network;
};

/** Encode a JSON object to a base64 string suitable for an HTTP header value. */
export function encodeHeader(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

/** Decode a base64-encoded JSON header value. Returns null on any error. */
export function decodeHeader<T = unknown>(value: string): T | null {
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Convert a USDC dollar amount to atomic units (6 decimals). The x402 spec
 * wants the amount as a decimal string to avoid float precision drift.
 */
export function usdcToAtomicString(usdc: number): string {
  return Math.round(usdc * 1_000_000).toString();
}

/**
 * Build a challenge for a single Solana-devnet USDC payment option.
 * Today we only declare one option; multi-option support is trivial later.
 */
export function buildChallenge(args: {
  amountUsdc: number;
  payTo: string;
  network: X402Network;
  asset?: string;
  maxTimeoutSeconds?: number;
}): X402Challenge {
  return {
    x402Version: X402_VERSION,
    accepts: [
      {
        scheme: "exact",
        network: args.network,
        asset: args.asset ?? USDC_MINT_DEVNET,
        amountAtomic: usdcToAtomicString(args.amountUsdc),
        payTo: args.payTo,
        maxTimeoutSeconds: args.maxTimeoutSeconds ?? 60,
      },
    ],
  };
}

/** Best-effort payer extraction. Spec puts it in authorization.payer. */
export function extractPayerFromPayload(p: X402PaymentPayload): string | null {
  const payer = p.authorization?.payer;
  return typeof payer === "string" && payer.length > 0 ? payer : null;
}
