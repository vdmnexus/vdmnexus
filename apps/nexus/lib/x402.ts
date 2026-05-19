/**
 * x402 — protocol header constants and wire-format codec.
 *
 * Types come from `@x402/core` (canonical, version 2 spec). This module
 * just adds header-name constants, base64-JSON encoding helpers, and a
 * small challenge-builder for the common Solana-devnet USDC case.
 *
 * Reference: https://github.com/coinbase/x402, npm: @x402/core
 */

import type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
} from "@x402/core/types";
import {
  SOLANA_DEVNET_CAIP2,
  SOLANA_MAINNET_CAIP2,
} from "@x402/svm";

export type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
};

/** Wire-format protocol version we declare in challenges. */
export const X402_VERSION = 2;

export const X402_PAYMENT_HEADER = "x-payment";
export const X402_REQUIRED_HEADER = "x-payment-required";
export const X402_RESPONSE_HEADER = "x-payment-response";

/**
 * CAIP-2 network identifiers for x402. @x402/svm expects the full form
 * (chain namespace + genesis-hash reference) — the short "solana:devnet"
 * lookalike is silently unsupported by the SVM scheme's RPC lookup.
 */
export const X402_NETWORKS = {
  solanaDevnet: SOLANA_DEVNET_CAIP2,
  solanaMainnet: SOLANA_MAINNET_CAIP2,
} as const satisfies Record<string, Network>;

/** Devnet USDC mint (Circle's official Solana devnet token). */
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

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

/** Convert a USDC dollar amount to atomic units (6 decimals, decimal string). */
export function usdcToAtomicString(usdc: number): string {
  return Math.round(usdc * 1_000_000).toString();
}

/**
 * Build a spec-conformant PaymentRequired challenge for a single
 * Solana USDC payment option.
 */
export function buildChallenge(args: {
  amountUsdc: number;
  payTo: string;
  network: Network;
  asset?: string;
  maxTimeoutSeconds?: number;
  resource: ResourceInfo;
}): PaymentRequired {
  const requirement: PaymentRequirements = {
    scheme: "exact",
    network: args.network,
    asset: args.asset ?? USDC_MINT_DEVNET,
    amount: usdcToAtomicString(args.amountUsdc),
    payTo: args.payTo,
    maxTimeoutSeconds: args.maxTimeoutSeconds ?? 60,
    extra: {},
  };
  return {
    x402Version: X402_VERSION,
    resource: args.resource,
    accepts: [requirement],
  };
}

/**
 * Solana-flavored payment payload — what the spec calls `payload.payload`
 * for a Solana SPL transfer. The client encodes a partially-signed
 * Solana transaction here; the facilitator co-signs and broadcasts.
 */
export type SolanaPaymentPayload = {
  /** Base64-encoded partially-signed Solana transaction. */
  transaction: string;
  /** Payer wallet (first signer) in base58. The server treats this as identity. */
  payer: string;
};

/** Best-effort payer extraction from a PaymentPayload's scheme-specific payload. */
export function extractPayerFromPayload(p: PaymentPayload): string | null {
  const inner = p.payload as Partial<SolanaPaymentPayload> | undefined;
  const payer = inner?.payer;
  return typeof payer === "string" && payer.length > 0 ? payer : null;
}
