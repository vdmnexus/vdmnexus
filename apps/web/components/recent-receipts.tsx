"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReceiptCard = {
  id: string;
  agent_pubkey: string;
  model: string | null;
  cost_usdc: number | null;
  has_tx: boolean;
  network: string | null;
  created_at: string;
};

const REFRESH_MS = 60_000;

export function RecentReceipts() {
  const [receipts, setReceipts] = useState<ReceiptCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/recent-receipts?limit=5", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { receipts: ReceiptCard[] };
        if (!cancelled && Array.isArray(json.receipts)) {
          setReceipts(json.receipts);
        }
      } catch {
        // Silent — homepage degrades to skeleton if the API is down.
      }
    }

    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const rows: Array<ReceiptCard | null> =
    receipts ?? Array.from({ length: 5 }, () => null);

  return (
    <div className="rounded-xl border border-soft bg-surface/40 px-5 py-5 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          Recent settlements
        </span>
        <Link
          href="/receipts"
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted transition-colors hover:text-text"
        >
          See all →
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-soft/60">
        {rows.map((row, i) => (
          <li key={row?.id ?? `skeleton-${i}`}>
            {row ? <ReceiptRow row={row} /> : <ReceiptRowSkeleton />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReceiptRow({ row }: { row: ReceiptCard }) {
  return (
    <Link
      href={`/r/${row.id}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 transition-colors hover:bg-bg/40 sm:gap-4"
    >
      <span className="font-mono text-[11px] tabular-nums text-text-muted">
        {formatAgo(row.created_at)}
      </span>

      <span className="min-w-0 truncate font-mono text-[12px] text-text">
        <span className="text-text-muted">{shortAgent(row.agent_pubkey)}</span>
        <span className="mx-1.5 text-text-muted">·</span>
        <span>{row.model ?? "unknown"}</span>
        {row.network ? (
          <>
            <span className="mx-1.5 text-text-muted">·</span>
            <span className="text-text-muted">{formatNetwork(row.network)}</span>
          </>
        ) : null}
      </span>

      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums text-text">
          {formatCost(row.cost_usdc)}
        </span>
        {row.has_tx ? (
          <span
            title="Settled on-chain (x402)"
            className="inline-flex items-center rounded-sm bg-accent-indigo/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-indigo"
          >
            on-chain
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function ReceiptRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 sm:gap-4">
      <span className="h-3 w-10 rounded bg-soft/60" />
      <span className="h-3 w-2/3 rounded bg-soft/40" />
      <span className="h-3 w-12 rounded bg-soft/60" />
    </div>
  );
}

function shortAgent(pubkey: string): string {
  if (!pubkey) return "—";
  if (pubkey.length <= 14) return pubkey;
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`;
}

function formatCost(usdc: number | null): string {
  if (usdc == null || !Number.isFinite(usdc)) return "—";
  if (usdc < 0.0001) return "<$0.0001";
  if (usdc < 1) return `$${usdc.toFixed(4)}`;
  return `$${usdc.toFixed(2)}`;
}

// CAIP-2 ids → human-readable. Solana's CAIP-2 form is
// `solana:<32-char-genesis-hash-prefix>`. We accept both the symbolic
// forms (solana:mainnet / solana:devnet) and the on-the-wire CAIP-2 forms
// the receipts actually carry.
const SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const SOLANA_DEVNET_CAIP2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

function formatNetwork(network: string): string {
  if (network === "solana:mainnet" || network === SOLANA_MAINNET_CAIP2) {
    return "Solana";
  }
  if (network === "solana:devnet" || network === SOLANA_DEVNET_CAIP2) {
    return "Solana devnet";
  }
  if (network === "eip155:8453") return "Base";
  if (network === "eip155:84532") return "Base Sepolia";
  // Unknown — strip the chain-id half so it doesn't dominate the row.
  if (network.startsWith("solana:")) return "Solana";
  if (network.startsWith("eip155:")) return "EVM";
  return network;
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}
