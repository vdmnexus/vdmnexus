/**
 * x402 challenge builder and CAIP-2 network helpers.
 *
 * Mirrors `apps/nexus/lib/x402.ts`, stripped of all `process.env` reads so
 * the paywall stays configuration-driven. Builders pass `network` in
 * `PaywallConfig`; `resolveNetwork()` accepts both the friendly aliases
 * (`solana-devnet`, `base`, etc.) and the canonical CAIP-2 strings that
 * `@x402/svm` and `@x402/core` actually need on the wire.
 */

import type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
} from "@x402/core/types";
import { SOLANA_DEVNET_CAIP2, SOLANA_MAINNET_CAIP2 } from "@x402/svm";

export type { Network, PaymentPayload, PaymentRequired, PaymentRequirements, ResourceInfo };

export const X402_VERSION = 2;

export const BASE_MAINNET_CAIP2 = "eip155:8453" as Network;
export const BASE_SEPOLIA_CAIP2 = "eip155:84532" as Network;

export const X402_NETWORKS = {
  solanaDevnet: SOLANA_DEVNET_CAIP2,
  solanaMainnet: SOLANA_MAINNET_CAIP2,
  baseMainnet: BASE_MAINNET_CAIP2,
  baseSepolia: BASE_SEPOLIA_CAIP2,
} as const satisfies Record<string, Network>;

export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export type NetworkAlias =
  | "solana-devnet"
  | "solana-mainnet"
  | "base"
  | "base-mainnet"
  | "base-sepolia";

export function resolveNetwork(input: Network | NetworkAlias | string): Network {
  const v = input.trim().toLowerCase();
  if (v === "solana-devnet") return X402_NETWORKS.solanaDevnet;
  if (v === "solana-mainnet") return X402_NETWORKS.solanaMainnet;
  if (v === "base" || v === "base-mainnet") return X402_NETWORKS.baseMainnet;
  if (v === "base-sepolia") return X402_NETWORKS.baseSepolia;

  // Full CAIP-2 form pass-through. Anything that matches our known set is
  // returned as-is; an unrecognised string is returned unchanged and the
  // facilitator will reject it at verify-time rather than us guessing.
  return input as Network;
}

export function isEvmNetwork(network: string): boolean {
  return network.startsWith("eip155:");
}

export function defaultUsdcAsset(network: string): string {
  if (network === BASE_MAINNET_CAIP2) return USDC_BASE_MAINNET;
  if (network === BASE_SEPOLIA_CAIP2) return USDC_BASE_SEPOLIA;
  if (network === SOLANA_MAINNET_CAIP2) return USDC_MINT_MAINNET;
  // Default: Solana devnet USDC. Catches SOLANA_DEVNET_CAIP2, any unknown
  // network string, and (defensively) Solana mainnet if the constant has
  // drifted from @x402/svm's genesis-hash form.
  return USDC_MINT_DEVNET;
}

export function usdcToAtomicString(usdc: number): string {
  return Math.round(usdc * 1_000_000).toString();
}

export function buildChallenge(args: {
  amountUsdc: number;
  payTo: string;
  network: Network;
  asset?: string;
  maxTimeoutSeconds?: number;
  resource: ResourceInfo;
  feePayer?: string;
}): PaymentRequired {
  // SVM's ExactSvmScheme needs `extra.feePayer` so it knows whose key co-signs
  // at settlement; EVM's ExactEvmScheme pays gas in ETH and has no equivalent.
  const extra: Record<string, unknown> = isEvmNetwork(args.network)
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

export function extractPayerFromPayload(p: PaymentPayload): string | null {
  const inner = p.payload as { payer?: string } | undefined;
  const payer = inner?.payer;
  return typeof payer === "string" && payer.length > 0 ? payer : null;
}
