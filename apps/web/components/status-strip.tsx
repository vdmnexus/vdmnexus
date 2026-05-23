"use client";

/**
 * Operational pulse strip — slim band above the nav showing whether the
 * mainnet rail is live, when the last receipt landed, and the rolling
 * 60-minute count. Same component lives on verify.vdmnexus.com (vanilla
 * CSS port) and is the visible-everywhere trust signal.
 *
 * Fetches /api/pulse from vdmnexus.com on mount and every 60s. Re-renders
 * the "X seconds ago" label on a 5s timer between fetches so the age
 * stays honest. Fails closed (renders nothing) on network errors so a
 * misbehaving API never blocks the page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

type PulseStatus = "live" | "degraded" | "down";

type PulseBody = {
  status: PulseStatus;
  latest_receipt: { id: string; created_at: string } | null;
  receipts_last_hour: number;
  updated_at: string;
};

const POLL_INTERVAL_MS = 60_000;
const TICK_INTERVAL_MS = 5_000;

export function StatusStrip({ endpoint = "/api/pulse" }: { endpoint?: string }) {
  const [pulse, setPulse] = useState<PulseBody | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as PulseBody;
        if (!cancelled) {
          setPulse(body);
          setNow(Date.now());
        }
      } catch {
        // Silent — strip renders nothing rather than show a broken band.
      }
    }
    void load();
    const pollId = setInterval(load, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [endpoint]);

  if (!pulse) return null;

  const ageLabel = formatAge(pulse.latest_receipt?.created_at, now);
  const dotClass = STATUS_DOT[pulse.status];
  const statusLabel = STATUS_LABEL[pulse.status];

  return (
    <div className="w-full border-b border-soft bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-8 w-full max-w-6xl items-center justify-between px-6 text-[11px] text-text-muted">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`}
              aria-hidden
            />
            <span className="font-mono uppercase tracking-[0.16em] text-text">
              mainnet · {statusLabel}
            </span>
          </span>
          <Separator />
          {pulse.latest_receipt ? (
            <Link
              href={`/r/${pulse.latest_receipt.id}`}
              className="hidden truncate font-mono transition-colors hover:text-text sm:inline-flex sm:items-center sm:gap-1.5"
            >
              <span>Latest receipt</span>
              <span className="text-text">{ageLabel}</span>
            </Link>
          ) : (
            <span className="hidden font-mono sm:inline">
              No mainnet receipts yet
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono">
            <span className="text-text">{pulse.receipts_last_hour}</span> in
            last hour
          </span>
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden className="hidden text-text-muted/40 sm:inline">
      ·
    </span>
  );
}

// Green only when mainnet is actively live (receipt in the last 5 min).
// Anything older — including the merely-quiet last-60-min and the
// no-traffic-in-an-hour state — is a muted grey. Red is reserved for
// genuine outages we surface elsewhere (5xx on /api/pulse silently
// hides the strip entirely). The textual label still distinguishes
// live vs degraded vs quiet for anyone who looks past the dot.
const STATUS_DOT: Record<PulseStatus, string> = {
  live: "bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
  degraded: "bg-slate-500/60",
  down: "bg-slate-500/60",
};

const STATUS_LABEL: Record<PulseStatus, string> = {
  live: "live",
  degraded: "degraded",
  down: "quiet",
};

function formatAge(createdAt: string | undefined, nowMs: number | null): string {
  if (!createdAt || !nowMs) return "—";
  const ageSec = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 1000));
  if (ageSec < 5) return "just now";
  if (ageSec < 60) return `${ageSec}s ago`;
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) return `${ageMin}m ago`;
  const ageHr = Math.floor(ageMin / 60);
  if (ageHr < 24) return `${ageHr}h ago`;
  const ageDay = Math.floor(ageHr / 24);
  return `${ageDay}d ago`;
}
