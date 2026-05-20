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
