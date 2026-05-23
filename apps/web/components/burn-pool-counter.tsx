"use client";

import { useEffect, useState } from "react";

type DailyBucket = { date: string; usdc: number };

type BurnPoolPayload = {
  total_usdc: number;
  last_30d_daily: DailyBucket[];
  updated_at: string;
};

const REFRESH_MS = 60_000;

function formatUsdc(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDay(d: string): string {
  // YYYY-MM-DD → MMM DD (e.g. "May 23"). Avoid a calendar lib for one
  // line — the input format is guaranteed by the API.
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[m - 1]} ${day}`;
}

export function BurnPoolCounter() {
  const [data, setData] = useState<BurnPoolPayload | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPool() {
      try {
        const res = await fetch("/api/burn-pool", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setErrored(true);
          return;
        }
        const json = (await res.json()) as BurnPoolPayload;
        if (!cancelled) {
          setData(json);
          setErrored(false);
        }
      } catch {
        if (!cancelled) setErrored(true);
      }
    }

    void fetchPool();
    const id = window.setInterval(fetchPool, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const total = data?.total_usdc ?? 0;
  const daily = data?.last_30d_daily ?? [];
  const maxDaily = daily.reduce((m, d) => Math.max(m, d.usdc), 0);
  const nonZeroDays = daily.filter((d) => d.usdc > 0).length;

  return (
    <div className="rounded-2xl border border-accent-indigo/40 bg-gradient-to-br from-accent-indigo/10 via-surface/60 to-surface/60 p-8 backdrop-blur sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-indigo">
          Wire 1 · Live
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
          <span
            aria-hidden
            className={
              errored
                ? "h-1.5 w-1.5 rounded-full bg-text-muted"
                : "h-1.5 w-1.5 animate-soft-pulse rounded-full bg-accent-indigo"
            }
          />
          {errored ? "Counter unavailable" : "Updating every 60s"}
        </span>
      </div>

      <div className="mt-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Accumulated burn pool
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-4xl font-semibold tracking-tight text-text tabular-nums sm:text-5xl">
            {data ? formatUsdc(total) : "—"}
          </span>
          <span className="text-base font-medium text-text-muted">USDC</span>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
          50% of every receipt fee accrues here. At $NEXUS launch this
          balance swaps to $NEXUS on the pump.fun pool and burns to a
          public address. Counter is on-chain-anchored — every USDC in
          this number traces back to a settled x402 receipt.
        </p>
      </div>

      {daily.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Last 30 days
            </span>
            <span className="font-mono text-[11px] text-text-muted tabular-nums">
              {nonZeroDays}/30 days with activity
            </span>
          </div>
          <div className="mt-3 flex h-16 items-end gap-1">
            {daily.map((d) => {
              const pct = maxDaily > 0 ? (d.usdc / maxDaily) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="group relative flex-1 rounded-sm bg-accent-indigo/15"
                  style={{ height: `${Math.max(2, pct)}%` }}
                  title={`${formatDay(d.date)}: ${formatUsdc(d.usdc)} USDC`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded border border-soft bg-surface px-2 py-1 font-mono text-[10px] text-text group-hover:block">
                    {formatDay(d.date)}: {formatUsdc(d.usdc)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-text-muted">
            <span>{daily[0] ? formatDay(daily[0].date) : ""}</span>
            <span>
              {daily[daily.length - 1]
                ? formatDay(daily[daily.length - 1]!.date)
                : ""}
            </span>
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-xs text-text-muted">
        Phase A (this counter): every paid call accrues USDC into the
        pool. Phase B (post-launch): scheduled USDC → $NEXUS swap on
        the pump.fun pool followed by send-to-burn-address transaction.
        Burn address publishes 48 hours before $NEXUS launch.
      </p>
    </div>
  );
}
