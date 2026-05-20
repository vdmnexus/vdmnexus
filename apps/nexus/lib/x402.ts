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
 * CAIP-2 network identifiers for x402.
 *
 * @x402/svm expects the genesis-hash form for Solana — the short
 * "solana:devnet" lookalike is silently unsupported. EVM chains use
 * standard CAIP-2 `eip155:<chainId>` form (Base mainnet = 8453, Base
 * Sepolia = 84532).
 */
export const BASE_MAINNET_CAIP2 = "eip155:8453" as Network;
export const BASE_SEPOLIA_CAIP2 = "eip155:84532" as Network;

export const X402_NETWORKS = {
  solanaDevnet: SOLANA_DEVNET_CAIP2,
  solanaMainnet: SOLANA_MAINNET_CAIP2,
  baseMainnet: BASE_MAINNET_CAIP2,
  baseSepolia: BASE_SEPOLIA_CAIP2,
} as const satisfies Record<string, Network>;

/** Devnet USDC mint (Circle's official Solana devnet token). */
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
/** USDC on Base mainnet (Circle, 6 decimals). */
export const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32A07f04b6dEDD1c2E";
/** USDC on Base Sepolia testnet (Circle, 6 decimals). */
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** True if the CAIP-2 network identifier is EVM (eip155). */
export function isEvmNetwork(network: string): boolean {
  return network.startsWith("eip155:");
}

/** Default USDC asset address/mint for a given CAIP-2 network. */
export function defaultUsdcAsset(network: string): string {
  if (network === BASE_MAINNET_CAIP2) return USDC_BASE_MAINNET;
  if (network === BASE_SEPOLIA_CAIP2) return USDC_BASE_SEPOLIA;
  return USDC_MINT_DEVNET;
}

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
 *
 * For SVM the client's `@x402/svm` ExactSvmScheme requires
 * `extra.feePayer` so it knows whose key will co-sign as fee payer at
 * settlement. We use the recipient as the fee payer because the
 * self-hosted facilitator consolidates both roles into a single
 * wallet (NEXUS_DEPOSIT_ADDRESS).
 */
export function buildChallenge(args: {
  amountUsdc: number;
  payTo: string;
  network: Network;
  asset?: string;
  maxTimeoutSeconds?: number;
  resource: ResourceInfo;
  feePayer?: string;
}): PaymentRequired {
  const evm = isEvmNetwork(args.network);
  // SVM's ExactSvmScheme requires `extra.feePayer` so it knows whose key
  // co-signs as fee payer at settlement. EVM's ExactEvmScheme has no
  // equivalent — the facilitator pays gas in ETH directly.
  const extra: Record<string, unknown> = evm
    ? {}
    : { feePayer: args.feePayer ?? args.payTo };
  const requirement: PaymentRequirements = {
    scheme: "exact",
    network: args.network,
    asset: args.asset ?? defaultUsdcAsset(args.network),
    amount: usdcToAtomicString(args.amountUsdc),
    payTo: args.payTo,
    maxTimeoutSeconds: args.maxTimeoutSeconds ?? 60,
    extra,
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
