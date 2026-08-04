import { createConfig, http } from "wagmi";
// Per-connector subpaths, not the `wagmi/connectors` barrel. The barrel
// re-exports every connector including `tempoWallet`, whose optional peer
// (`accounts`) isn't installed — webpack resolves the whole barrel and
// fails the build on it. Importing the two we actually use avoids pulling
// the rest of the graph in at all.
import { injected } from "wagmi/connectors/injected";
import { walletConnect } from "wagmi/connectors/walletConnect";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";

/**
 * wagmi config for the marketing site.
 *
 * Connectors: injected (MetaMask, Rabby, Coinbase Wallet extension, any
 * EIP-1193 provider) always. WalletConnect only when
 * `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set — the connector requires a
 * Reown/WalletConnect Cloud project id, and it fails at runtime with an
 * empty string rather than degrading. Free tier is enough; until the id is
 * in Vercel env, the site is injected-only and says so.
 *
 * `ssr: true` so wagmi doesn't read storage during the server render — the
 * first client paint reconciles from localStorage.
 */
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

let config: ReturnType<typeof createWagmiConfig> | undefined;

function createWagmiConfig() {
  return createConfig({
    chains: [robinhoodTestnet, robinhoodMainnet],
    connectors: [
      injected({ shimDisconnect: true }),
      ...(walletConnectProjectId
        ? [
            walletConnect({
              projectId: walletConnectProjectId,
              showQrModal: true,
              metadata: {
                name: "VDM Nexus",
                description: "Rienda — the self-custodial agent vault.",
                url: "https://vdmnexus.com",
                icons: ["https://vdmnexus.com/mark.svg"],
              },
            }),
          ]
        : []),
    ],
    transports: {
      [robinhoodTestnet.id]: http(),
      [robinhoodMainnet.id]: http(),
    },
    ssr: true,
  });
}

/** Memoised so React Fast Refresh doesn't spawn a second config. */
export function getWagmiConfig() {
  config ??= createWagmiConfig();
  return config;
}

/** True when a WalletConnect project id is configured. Drives the UI note. */
export const walletConnectEnabled = Boolean(walletConnectProjectId);
