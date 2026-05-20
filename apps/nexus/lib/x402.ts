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

/**
 * Mainnet-vs-testnet classifier for the kill switch.
 *
 * Inspects the raw `X402_NETWORK` env value. Returns `true` (mainnet) when the
 * identifier is missing, unknown, or looks like a production chain. Returns
 * `false` only for clearly-named test networks. Fails closed: anything we
 * don't recognise is treated as mainnet so the kill switch can't be bypassed
 * by typos or new chains being added to the route before this list is
 * updated.
 */
const TESTNET_MARKERS = [
  "devnet",
  "testnet",
  "sepolia",
  "goerli",
  "holesky",
] as const;

export function isMainnetNetwork(network: string | undefined | null): boolean {
  if (!network) return true;
  const n = network.toLowerCase();
  return !TESTNET_MARKERS.some((marker) => n.includes(marker));
}

/**
 * Hard ceiling on the flat USDC price advertised in 402 challenges. Capped
 * by `NEXUS_MAX_PRICE_USDC` (default 0.10 USDC). If a misconfiguration sets
 * `X402_FLAT_PRICE_USDC` above the cap, the route refuses to issue a
 * challenge — fail-closed so an unbounded charge can't slip through.
 */
const DEFAULT_MAX_PRICE_USDC = 0.1;

export function getMaxPriceUsdc(): number {
  const raw = process.env.NEXUS_MAX_PRICE_USDC;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PRICE_USDC;
}

/**
 * Parsed `NEXUS_ALLOWED_AGENTS` allowlist. When unset/empty the allowlist
 * is disabled (returns `null`); when set, the route rejects any payer not
 * in the list with 403. Comma-separated, base58 pubkeys, whitespace
 * tolerant, deduplicated.
 */
export function getAllowedAgents(): Set<string> | null {
  const raw = process.env.NEXUS_ALLOWED_AGENTS?.trim();
  if (!raw) return null;
  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (entries.length === 0) return null;
  return new Set(entries);
}

/**
 * Mainnet kill switch. When `NEXUS_MAINNET_ENABLED=false`, the route returns
 * 503 on every mainnet-bound request. Any value other than the literal
 * string "false" leaves the switch on (default), so a missing env var
 * doesn't accidentally take prod offline.
 */
export function mainnetEnabled(): boolean {
  const raw = process.env.NEXUS_MAINNET_ENABLED?.trim().toLowerCase();
  return raw !== "false";
}

/**
 * Resolve a request-supplied network selector to a CAIP-2 Network identifier.
 * Returns `null` for unknown inputs so the route can reject with 400 instead
 * of silently routing to a default. Friendly aliases match `getNetwork()`.
 *
 * This is the inverse of relying on the `X402_NETWORK` env var alone — the
 * agent can opt into mainnet (or Base, or Base Sepolia) per call, while the
 * env var remains the *default* for clients that don't ask.
 */
export function resolveNetworkInput(input: string): Network | null {
  const lower = input.trim().toLowerCase();
  if (!lower) return null;
  if (lower === "devnet" || lower === "solana-devnet" || lower === "solana:devnet") {
    return X402_NETWORKS.solanaDevnet;
  }
  if (lower === "mainnet" || lower === "solana-mainnet" || lower === "solana:mainnet") {
    return X402_NETWORKS.solanaMainnet;
  }
  if (lower === "base" || lower === "base-mainnet" || lower === "eip155:8453") {
    return X402_NETWORKS.baseMainnet;
  }
  if (lower === "base-sepolia" || lower === "eip155:84532") {
    return X402_NETWORKS.baseSepolia;
  }
  // Pass-through for exact CAIP-2 forms we know about.
  if (input === X402_NETWORKS.solanaDevnet) return X402_NETWORKS.solanaDevnet;
  if (input === X402_NETWORKS.solanaMainnet) return X402_NETWORKS.solanaMainnet;
  return null;
}

/**
 * Resolve the `payTo` recipient address for a given network. Mainnet falls
 * back through `NEXUS_MAINNET_DEPOSIT_ADDRESS` → `X402_RECIPIENT_ADDRESS` →
 * `NEXUS_DEPOSIT_ADDRESS`. Devnet/testnets fall through the original
 * `X402_RECIPIENT_ADDRESS` → `NEXUS_DEPOSIT_ADDRESS` chain. This lets
 * operators separate mainnet receipts into a different wallet for
 * accounting without forcing them to.
 */
export function getRecipientForNetwork(network: Network): string | null {
  const devnetOrTestnet =
    process.env.X402_RECIPIENT_ADDRESS?.trim() ||
    process.env.NEXUS_DEPOSIT_ADDRESS?.trim() ||
    null;
  if (!isMainnetNetwork(network)) return devnetOrTestnet;
  return (
    process.env.NEXUS_MAINNET_DEPOSIT_ADDRESS?.trim() ||
    devnetOrTestnet
  );
}
