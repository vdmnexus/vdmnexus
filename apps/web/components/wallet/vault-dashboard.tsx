"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@/components/wallet/connect-button";
import {
  DEFAULT_CHAIN,
  SUPPORTED_CHAINS,
  explorerAddressUrl,
  supportedChain,
} from "@/lib/chains";
import { walletConnectEnabled } from "@/lib/wagmi";

/**
 * The /app surface.
 *
 * What this does today: connect a wallet, show the connected address and
 * chain, switch between the two Robinhood Chain networks.
 *
 * What it deliberately does NOT do: create a vault. There is no deployed
 * VaultFactory — the contracts live in a separate private repo, pre-audit,
 * and deploy to Robinhood Chain testnet first. A "Create vault" button
 * here would be a lie, so the vault list renders an empty state that says
 * what is actually missing. Wire the factory address + ABI in before
 * adding any write path.
 */
export function VaultDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const chain = supportedChain(chainId);

  if (!mounted) {
    return <PanelSkeleton />;
  }

  if (!isConnected || !address) {
    return (
      <div className="rounded-2xl border border-soft bg-surface/60 p-7 backdrop-blur sm:p-9">
        <h2 className="text-xl font-semibold tracking-tight text-text">
          Connect a wallet to start
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
          Connecting reads your address and the chain you&apos;re on. Nothing
          is signed, nothing is sent, no transaction is proposed. There is no
          account to create — the wallet is the identity.
        </p>
        <div className="mt-7">
          <ConnectButton />
        </div>
        <p className="mt-6 text-xs leading-relaxed text-text-muted/80">
          {walletConnectEnabled
            ? "Browser wallets (MetaMask, Rabby, Coinbase Wallet) and WalletConnect."
            : "Browser wallets only right now — MetaMask, Rabby, Coinbase Wallet, or any EIP-1193 extension. WalletConnect turns on when a project id is configured."}
        </p>
      </div>
    );
  }

  const explorer = explorerAddressUrl(chainId, address);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-soft bg-surface/60 p-7 backdrop-blur sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Connected
            </div>
            <div className="mt-2 break-all font-mono text-sm text-text sm:text-base">
              {address}
            </div>
            {explorer && (
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-xs text-text-muted underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text"
              >
                View on the explorer ↗
              </a>
            )}
          </div>
          <ConnectButton />
        </div>

        <div className="mt-7 border-t border-soft pt-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            Network
          </div>
          {chain ? (
            <p className="mt-2 text-sm text-text">
              {chain.name}{" "}
              <span className="font-mono text-xs text-text-muted">
                · chain id {chain.id}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-300">
              Chain {chainId ?? "unknown"} — not a Robinhood Chain network.
              Switch below.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {SUPPORTED_CHAINS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => switchChain({ chainId: c.id })}
                disabled={isSwitching || c.id === chainId}
                className={
                  c.id === chainId
                    ? "rounded-md border border-accent-indigo/60 bg-accent-indigo/15 px-3.5 py-1.5 text-xs font-medium text-text"
                    : "rounded-md border border-soft bg-bg/40 px-3.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text disabled:opacity-50"
                }
              >
                {c.id === chainId ? `On ${c.name}` : `Switch to ${c.name}`}
              </button>
            ))}
          </div>
          {chain?.testnet === false && (
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-amber-300/90">
              Robinhood Chain mainnet holds no Rienda contracts. Mainnet is
              gated behind an external audit and legal review. Testnet
              ({DEFAULT_CHAIN.name}, chain id {DEFAULT_CHAIN.id}) is where the
              first deploy lands.
            </p>
          )}
        </div>
      </div>

      <VaultEmptyState />
    </div>
  );
}

/**
 * The honest empty state. No fabricated addresses, no disabled "Create
 * vault" button pretending the flow exists — just what is missing and what
 * has to land before it isn't.
 */
function VaultEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface/40 p-7 backdrop-blur sm:p-9">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Your vaults
        </span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
          Not deployed
        </span>
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-text">
        Vault creation opens with the testnet deploy.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
        There is no VaultFactory contract on either Robinhood Chain network
        yet, so there is nothing here to read and nothing to create. The vault
        and policy-engine contracts are in development in a separate repo and
        deploy to {DEFAULT_CHAIN.name} (chain id {DEFAULT_CHAIN.id}) first.
        Mainnet waits for an external audit and a legal review — however long
        both take.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
        When the factory lands, this page reads your vaults from it, shows
        the policy each one enforces, and links every trade to the signed
        receipt of the inference that proposed it. Until then, connecting is
        the only thing this page does.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/rienda"
          className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
        >
          Read the ten guardrails
        </Link>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          Follow the roadmap
        </Link>
        <Link
          href="/disclosures"
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          Disclosures
        </Link>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="h-48 rounded-2xl border border-soft bg-surface/40 backdrop-blur" />
  );
}
