"use client";

import { useEffect, useState } from "react";

type Stats = {
  agents: number;
  inferences: number;
  settled_usdc: number;
  paid_calls: number;
  updated_at: string;
};

const REFRESH_MS = 60_000;

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Stats;
        if (!cancelled) setStats(json);
      } catch {
        // Silent — landing page degrades to skeleton if the API is down.
      }
    }

    void fetchStats();
    const id = window.setInterval(fetchStats, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const cells: Array<{ label: string; value: string; sub?: string }> = stats
    ? [
        {
          label: "Agents",
          value: formatInt(stats.agents),
          sub: "with signed inference",
        },
        {
          label: "Inferences",
          value: formatInt(stats.inferences),
          sub: "settled end-to-end",
        },
        {
          label: "USDC processed",
          value: formatUsdc(stats.settled_usdc),
          sub: "across the rail",
        },
        {
          label: "On-chain payments",
          value: formatInt(stats.paid_calls),
          sub: "x402, Solana mainnet",
        },
      ]
    : Array.from({ length: 4 }, () => ({ label: "", value: "—" }));

  return (
    <div className="rounded-xl border border-soft bg-surface/50 px-5 py-5 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          Live · mainnet
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
          <span
            aria-hidden
            className={
              "inline-block h-1.5 w-1.5 rounded-full bg-accent-indigo " +
              (reduced ? "" : "animate-soft-pulse")
            }
          />
          updating
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
        {cells.map((cell, i) => (
          <div key={i} className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {cell.label || " "}
            </dt>
            <dd className="mt-1 truncate text-2xl font-semibold tabular-nums text-text sm:text-3xl">
              {cell.value}
            </dd>
            {cell.sub ? (
              <dd className="mt-0.5 truncate text-[11px] text-text-muted">
                {cell.sub}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatUsdc(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) {
    return "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  }
  if (n >= 1) {
    return "$" + n.toFixed(2);
  }
  // Sub-dollar: show 4 dp so cents-level activity is visible.
  return "$" + n.toFixed(4);
}
