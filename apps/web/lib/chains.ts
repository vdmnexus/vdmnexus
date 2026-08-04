import { defineChain } from "viem";

/**
 * Robinhood Chain — the Ethereum L2 Rienda vaults deploy to.
 *
 * Defined here as custom viem chains because neither network ships in
 * `viem/chains` yet. Native currency is ETH (18 decimals), the L2 default;
 * if Robinhood publishes a different gas token these two blocks are the
 * only place that changes.
 *
 * Testnet is the live target — the vault contracts are pre-audit and
 * testnet-only. Mainnet is defined so the wrong-network prompt can name it
 * and so switching works the day the audit clears, not because anything is
 * deployed there.
 */
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Testnet Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

export const robinhoodMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  testnet: false,
});

/** Chains the site will connect to, testnet first — that's where Rienda is. */
export const SUPPORTED_CHAINS = [robinhoodTestnet, robinhoodMainnet] as const;

/** The chain a freshly connected wallet is asked to switch to. */
export const DEFAULT_CHAIN = robinhoodTestnet;

const CHAIN_BY_ID = new Map<number, (typeof SUPPORTED_CHAINS)[number]>(
  SUPPORTED_CHAINS.map((c) => [c.id, c])
);

export function supportedChain(chainId: number | undefined) {
  return chainId === undefined ? undefined : CHAIN_BY_ID.get(chainId);
}

/** Explorer address URL for a chain we know about; null for anything else. */
export function explorerAddressUrl(
  chainId: number | undefined,
  address: string
): string | null {
  const chain = supportedChain(chainId);
  if (!chain) return null;
  return `${chain.blockExplorers.default.url}/address/${address}`;
}

/** `0x1234…abcd` — enough to recognise, short enough for a nav button. */
export function shortAddress(address: string): string {
  return address.length > 10
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}
