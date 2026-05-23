"use client";

/**
 * Docs-app port of the operational pulse strip. Fetches /api/pulse on
 * vdmnexus.com cross-origin and renders the same line of info as the
 * marketing site. Styled with Tailwind tokens via inline color values
 * to avoid coupling to fumadocs-ui's class system.
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

// Green only when mainnet is actively live (receipt in the last 5 min).
// Quiet / degraded states share a muted grey — the textual label
// already distinguishes them, and a red dot for "no traffic in the
// last hour" reads like an outage when it's just an idle window.
const QUIET_DOT: React.CSSProperties = {
  background: "rgba(148, 163, 184, 0.5)",
};
const DOT_STYLE: Record<PulseStatus, React.CSSProperties> = {
  live: {
    background: "#34d399",
    boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.18)",
  },
  degraded: QUIET_DOT,
  down: QUIET_DOT,
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
        // Silent fail.
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
    <div
      style={{
        width: "100%",
        borderBottom: "1px solid #1e1e2e",
        background: "rgba(8, 8, 16, 0.8)",
        backdropFilter: "blur(6px)",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 11,
        color: "#94a3b8",
        position: "sticky",
        top: 0,
        zIndex: 60,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 32,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                ...DOT_STYLE[pulse.status],
              }}
              aria-hidden
            />
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#f1f5f9",
              }}
            >
              mainnet · {STATUS_LABEL[pulse.status]}
            </span>
          </span>
          <span style={{ color: "rgba(148, 163, 184, 0.4)" }} aria-hidden>
            ·
          </span>
          {receiptUrl ? (
            <a
              href={receiptUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                color: "#94a3b8",
              }}
              className="docs-pulse-link"
            >
              <span>Latest receipt</span>
              <span style={{ color: "#f1f5f9" }}>{ageLabel}</span>
            </a>
          ) : (
            <span>No mainnet receipts yet</span>
          )}
        </div>
        <div>
          <span>
            <span style={{ color: "#f1f5f9" }}>
              {pulse.receipts_last_hour}
            </span>{" "}
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
