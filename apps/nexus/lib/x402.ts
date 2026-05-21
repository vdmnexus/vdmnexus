/**
 * x402 helpers for apps/nexus.
 *
 * The wire-format pieces (challenge builder, header codec, CAIP-2
 * constants) are re-exported from `@vdm-nexus/paywall` so the package and
 * the app share a single implementation. The env-bound helpers
 * (`getMaxPriceUsdc`, `getAllowedAgents`, `mainnetEnabled`,
 * `isMainnetNetwork`) stay here — they encode operator policy that's
 * specific to how Nexus runs, not something we want to bake into the
 * public package.
 */

export {
  X402_VERSION,
  X402_PAYMENT_HEADER,
  X402_REQUIRED_HEADER,
  X402_RESPONSE_HEADER,
  X402_NETWORKS,
  BASE_MAINNET_CAIP2,
  BASE_SEPOLIA_CAIP2,
  USDC_MINT_DEVNET,
  USDC_BASE_MAINNET,
  USDC_BASE_SEPOLIA,
  buildChallenge,
  decodeHeader,
  encodeHeader,
  extractPayerFromPayload,
  isEvmNetwork,
  defaultUsdcAsset,
  usdcToAtomicString,
} from "@vdm-nexus/paywall";

export type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
} from "@vdm-nexus/paywall";

// Local imports for use within this module. `export ... from` re-exports
// don't bring names into local scope, so the helpers below that reference
// `Network` / `X402_NETWORKS` need an explicit import too.
import { X402_NETWORKS } from "@vdm-nexus/paywall";
import type { Network } from "@vdm-nexus/paywall";

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

/**
 * Mainnet-vs-testnet classifier for the kill switch.
 *
 * Returns `true` (mainnet) when the identifier is missing, unknown, or looks
 * like a production chain. Returns `false` only for clearly-named test
 * networks OR known testnet CAIP-2 identifiers. Fails closed: anything we
 * don't recognise is treated as mainnet so the kill switch can't be bypassed
 * by typos or new chains being added before this list is updated.
 *
 * Two recognisers, OR'd together:
 *
 *   1. **String markers** — the network identifier contains a recognisable
 *      testnet substring (`devnet`, `sepolia`, …). Catches friendly aliases
 *      like `"solana-devnet"`, `"base-sepolia"`, env-style values like
 *      `"solana:devnet"`.
 *
 *   2. **Known testnet CAIP-2 identifiers** — for Solana, the canonical
 *      CAIP-2 identifier is genesis-hash form (`solana:EtWTRABZ…` for
 *      devnet, `solana:5eykt4Us…` for mainnet). The genesis hash contains
 *      no `devnet` substring, so string-marker matching MISSES it. We add
 *      the known testnet hashes explicitly so a devnet request resolved to
 *      its CAIP-2 form is correctly classified as testnet.
 *
 * Before the explicit CAIP-2 check existed, the route classified
 * `X402_NETWORKS.solanaDevnet` (the CAIP-2 form) as MAINNET and tripped
 * the kill switch on every devnet call — bricking the playground,
 * /receipts, and any agent test traffic whenever
 * `NEXUS_MAINNET_ENABLED=false`.
 */
const TESTNET_MARKERS = [
  "devnet",
  "testnet",
  "sepolia",
  "goerli",
  "holesky",
] as const;

const KNOWN_TESTNET_NETWORKS: ReadonlySet<string> = new Set<string>([
  X402_NETWORKS.solanaDevnet,
  X402_NETWORKS.baseSepolia,
]);

export function isMainnetNetwork(network: string | undefined | null): boolean {
  if (!network) return true;
  if (KNOWN_TESTNET_NETWORKS.has(network)) return false;
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
