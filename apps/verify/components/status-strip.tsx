"use client";

/**
 * Verify-app port of the operational pulse strip. Fetches /api/pulse on
 * vdmnexus.com cross-origin and renders the same line of info as the
 * marketing site. The verify app has no Tailwind — styles live in
 * globals.css under the `.status-*` namespace.
 */

import { useEffect, useState } from "react";

type PulseStatus = "live" | "degraded" | "down";

type PulseBody = {
  status: PulseStatus;
  latest_receipt: { id: string; created_at: string } | null;
  receipts_last_hour: number;
  updated_at: string;
};

const PULSE_URL = "https://vdmnexus.com/api/pulse";
const POLL_INTERVAL_MS = 60_000;
const TICK_INTERVAL_MS = 5_000;

const STATUS_LABEL: Record<PulseStatus, string> = {
  live: "live",
  degraded: "degraded",
  down: "quiet",
};

export function StatusStrip() {
  const [pulse, setPulse] = useState<PulseBody | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(PULSE_URL, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as PulseBody;
        if (!cancelled) {
          setPulse(body);
          setNow(Date.now());
        }
      } catch {
        // Silent fail — strip just doesn't render.
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
  }, []);

  if (!pulse) return null;

  const ageLabel = formatAge(pulse.latest_receipt?.created_at, now);
  const receiptUrl = pulse.latest_receipt
    ? `https://vdmnexus.com/r/${pulse.latest_receipt.id}`
    : null;

  return (
    <div className="status-strip">
      <div className="status-strip-inner">
        <div className="status-strip-left">
          <span className="status-cell">
            <span
              className={`status-dot status-dot-${pulse.status}`}
              aria-hidden
            />
            <span className="status-label">
              mainnet · {STATUS_LABEL[pulse.status]}
            </span>
          </span>
          <span className="status-sep" aria-hidden>
            ·
          </span>
          {receiptUrl ? (
            <a className="status-cell status-link" href={receiptUrl}>
              <span className="status-muted">Latest receipt</span>
              <span className="status-strong">{ageLabel}</span>
            </a>
          ) : (
            <span className="status-cell status-muted">
              No mainnet receipts yet
            </span>
          )}
        </div>
        <div className="status-strip-right">
          <span className="status-muted">
            <span className="status-strong">{pulse.receipts_last_hour}</span>{" "}
            in last hour
          </span>
        </div>
      </div>
    </div>
  );
}

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
