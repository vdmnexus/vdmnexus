import { isAddress, type Address } from "viem";
import { DEFAULT_CHAIN, robinhoodTestnet, supportedChain } from "@/lib/chains";

/**
 * Rienda contract addresses, read from env.
 *
 * Nothing is deployed as of this file landing. Every address is optional and
 * every consumer has to handle "unset" — that's the whole point of this
 * module. `isDeployed()` is the single gate the /live page uses to pick
 * between reading the chain and rendering an honest empty state.
 *
 * These are read on the server (the /live page and /api/rienda/live are both
 * `force-dynamic`), so a Vercel env change plus a redeploy is enough to light
 * the page up — no code change. The `NEXT_PUBLIC_` prefix is kept because
 * addresses are public information and a future client-side read path
 * shouldn't need a second set of names.
 */

/** An address env var that is set and parses. Anything else reads as unset. */
function address(raw: string | undefined): Address | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return isAddress(trimmed) ? (trimmed as Address) : undefined;
}

/** Optional non-negative bigint from env; undefined when unset or garbage. */
function blockNumber(raw: string | undefined): bigint | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  try {
    const n = BigInt(trimmed);
    return n >= BigInt(0) ? n : undefined;
  } catch {
    return undefined;
  }
}

export type RiendaConfig = {
  /** VaultFactory. The one address that gates the whole live view. */
  factory: Address | undefined;
  /** Mock price oracle used on testnet. Display-only. */
  mockOracle: Address | undefined;
  /** ERC-20 the vaults denominate in. Used to label NAV when readable. */
  settlementToken: Address | undefined;
  /** Chain the addresses live on. Defaults to Robinhood Chain testnet. */
  chainId: number;
  /**
   * Block the factory was deployed at. `getLogs` from genesis works on a
   * young testnet but many RPCs cap the scanned range — setting this keeps
   * the vault-list query one call instead of a windowed walk.
   */
  deployBlock: bigint | undefined;
  /**
   * Server-side RPC override. Use when the public endpoint rate-limits the
   * poll. Falls back to the URL baked into the chain definition.
   */
  rpcUrl: string | undefined;
  /**
   * Optional comma-separated vault addresses.
   *
   * Escape hatch for the window between the deploy and the ABI
   * reconciliation: if the provisional `VaultCreated` fragments don't match
   * the deployed event, the log-derived vault list comes back empty. Pinning
   * addresses here lets the per-vault panels read real state anyway. Merged
   * with (not replacing) whatever the logs produce.
   */
  pinnedVaults: readonly Address[];
};

export function riendaConfig(): RiendaConfig {
  const rawChainId = Number(
    process.env.NEXT_PUBLIC_RIENDA_CHAIN_ID?.trim() || DEFAULT_CHAIN.id
  );
  const chainId = supportedChain(rawChainId) ? rawChainId : robinhoodTestnet.id;

  return {
    factory: address(process.env.NEXT_PUBLIC_RIENDA_FACTORY_ADDRESS),
    mockOracle: address(process.env.NEXT_PUBLIC_RIENDA_MOCK_ORACLE),
    settlementToken: address(process.env.NEXT_PUBLIC_RIENDA_SETTLEMENT_TOKEN),
    chainId,
    deployBlock: blockNumber(process.env.NEXT_PUBLIC_RIENDA_DEPLOY_BLOCK),
    rpcUrl: process.env.RIENDA_RPC_URL?.trim() || undefined,
    pinnedVaults: addressList(process.env.NEXT_PUBLIC_RIENDA_VAULT_ADDRESSES),
  };
}

/** Comma-separated address list; invalid entries are dropped, not thrown on. */
function addressList(raw: string | undefined): readonly Address[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const part of raw.split(",")) {
    const parsed = address(part);
    if (parsed && !seen.has(parsed.toLowerCase())) {
      seen.add(parsed.toLowerCase());
      out.push(parsed);
    }
  }
  return out;
}

/**
 * True only when there is a factory address to read from.
 *
 * The oracle and settlement-token addresses are labels — the page renders
 * fine without them. Without a factory there is no vault list, no per-vault
 * panel, and no activity feed, so there is nothing to show and the page says
 * so instead of guessing.
 */
export function isDeployed(config: RiendaConfig = riendaConfig()): boolean {
  return config.factory !== undefined;
}

/** The chain object for the configured chain id. Testnet unless overridden. */
export function riendaChain(config: RiendaConfig = riendaConfig()) {
  return supportedChain(config.chainId) ?? robinhoodTestnet;
}
