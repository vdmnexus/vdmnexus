"use client";

import { useEffect, useState } from "react";
import type {
  ActivityEntry,
  FieldValue,
  GuardrailValue,
  LivePayload,
  VaultPanel,
} from "@/app/api/rienda/live/route";
import { explorerAddressUrl, explorerTxUrl, shortAddress } from "@/lib/chains";

/**
 * The configured half of /live.
 *
 * Every number here came off Robinhood Chain via /api/rienda/live. Nothing
 * is derived, filled in, or defaulted: a value the contract didn't return
 * renders the word "unavailable" and the getter names that were tried. The
 * ABI is provisional (see lib/rienda-abi.ts), so "unavailable" will be common
 * until it's reconciled against the deployed contracts — that's the honest
 * reading, not a bug to paper over.
 */

/** 12s — inside the 10-15s brief, and just outside the route's 10s cache. */
const POLL_MS = 12_000;

export function LiveView({ chainId }: { chainId: number }) {
  const [data, setData] = useState<LivePayload | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/rienda/live", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LivePayload;
        if (!cancelled) {
          setData(json);
          setFetchError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "request failed");
        }
      }
    }

    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    // A cold read is a few seconds of RPC round-trips. Say what's happening
    // rather than showing a dark rectangle that could read as "empty".
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-soft bg-surface/40 p-6 backdrop-blur">
          <p className="text-sm text-text-muted">
            {fetchError
              ? `Could not reach the reader: ${fetchError}. Retrying every ${POLL_MS / 1000}s.`
              : "Reading Robinhood Chain testnet…"}
          </p>
        </div>
        <div className="h-64 rounded-2xl border border-soft bg-surface/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChainHeader data={data} />

      {(data.errors.length > 0 || data.notes.length > 0 || fetchError) && (
        <Diagnostics
          errors={fetchError ? [...data.errors, `Reader: ${fetchError}`] : data.errors}
          notes={data.notes}
        />
      )}

      <Vaults data={data} chainId={chainId} />
      <Activity entries={data.activity} chainId={chainId} />
    </div>
  );
}

function ChainHeader({ data }: { data: LivePayload }) {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Block" value={data.blockNumber ?? "unavailable"} mono />
        <Stat label="Vaults" value={vaultCountLabel(data)} mono />
        <Stat
          label="Settlement token"
          value={
            data.tokenSymbol ??
            (data.settlementToken ? "symbol unavailable" : "not configured")
          }
        />
        <Stat label="Read at" value={formatClock(data.fetchedAt)} mono />
      </div>
      <p className="mt-5 border-t border-soft pt-4 text-xs text-text-muted">
        Refreshes every {POLL_MS / 1000}s. Read-only — this page never proposes
        a transaction.
      </p>
    </div>
  );
}

/**
 * Says where the vault list came from, because "1 vault" means something
 * different when it was decoded from a factory log than when it was pinned
 * in env. Prefers the factory's own count getter when that reads.
 */
function vaultCountLabel(data: LivePayload): string {
  const fromLogs = data.vaults.filter((v) => v.source === "log").length;
  const pinned = data.vaults.filter((v) => v.source === "pinned").length;

  if (data.vaultCount?.ok) {
    return `${data.vaultCount.value} per the factory`;
  }
  if (fromLogs === 0 && pinned === 0) return "none found";
  const parts: string[] = [];
  if (fromLogs > 0) parts.push(`${fromLogs} from logs`);
  if (pinned > 0) parts.push(`${pinned} pinned in env`);
  return parts.join(" + ");
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div
        className={
          mono
            ? "mt-2 break-all font-mono text-sm text-text"
            : "mt-2 break-all text-sm text-text"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Diagnostics({ errors, notes }: { errors: string[]; notes: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-6">
      {errors.length > 0 && (
        <>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300">
            What this page could not read
          </div>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-amber-200/90">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
      {notes.length > 0 && (
        <>
          <div
            className={
              errors.length > 0
                ? "mt-6 border-t border-amber-500/20 pt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted"
                : "text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted"
            }
          >
            How this reading was taken
          </div>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-text-muted">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Vaults({ data, chainId }: { data: LivePayload; chainId: number }) {
  if (data.vaults.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-soft bg-surface/40 p-7">
        <h2 className="text-lg font-semibold text-text">No vaults yet</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          The factory is deployed at{" "}
          <ExplorerAddress chainId={chainId} address={data.factory ?? ""} /> and
          responding, but no vault has been created in the scanned block range —
          or the deployed <code className="font-mono">VaultCreated</code> event
          doesn&apos;t match the fragments this page tries. Both cases show as
          an empty list; the note above says which one applies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {data.vaults.map((vault) => (
        <VaultCard
          key={vault.address}
          vault={vault}
          chainId={chainId}
          decimals={data.tokenDecimals}
          symbol={data.tokenSymbol}
        />
      ))}
    </div>
  );
}

function VaultCard({
  vault,
  chainId,
  decimals,
  symbol,
}: {
  vault: VaultPanel;
  chainId: number;
  decimals: number | null;
  symbol: string | null;
}) {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            Vault
          </div>
          <div className="mt-2">
            <ExplorerAddress chainId={chainId} address={vault.address} full />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            {vault.owner && (
              <span>
                owner{" "}
                <ExplorerAddress chainId={chainId} address={vault.owner} />
              </span>
            )}
            {vault.preset && <span>preset {vault.preset}</span>}
            {vault.createdBlock && <span>created at block {vault.createdBlock}</span>}
            {vault.source === "pinned" && (
              <span className="text-amber-300/90">
                pinned via env, not read from a factory log
              </span>
            )}
          </div>
        </div>
        <StateBadges vault={vault} />
      </div>

      <div className="mt-7 grid gap-5 border-t border-soft pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {vault.state
          .filter((f) => f.key !== "paused" && f.key !== "hibernating")
          .map((field) => (
            <div key={field.key}>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                {field.label}
              </div>
              <div className="mt-2 break-all font-mono text-sm text-text">
                {field.value.ok
                  ? formatStateValue(field.key, field.value.value, decimals, symbol)
                  : null}
                {!field.value.ok && <Unavailable reason={field.value.reason} />}
              </div>
            </div>
          ))}
      </div>

      <div className="mt-7 border-t border-soft pt-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Guardrails
        </div>
        <div className="mt-4 space-y-4">
          {vault.guardrails.map((g) => (
            <GuardrailRow key={g.key} g={g} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StateBadges({ vault }: { vault: VaultPanel }) {
  const paused = vault.state.find((f) => f.key === "paused")?.value;
  const hibernating = vault.state.find((f) => f.key === "hibernating")?.value;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        field={paused}
        onLabel="Paused"
        offLabel="Trading"
        onTone="amber"
      />
      <Badge
        field={hibernating}
        onLabel="Hibernating"
        offLabel="Full budget"
        onTone="amber"
      />
    </div>
  );
}

function Badge({
  field,
  onLabel,
  offLabel,
  onTone,
}: {
  field: FieldValue | undefined;
  onLabel: string;
  offLabel: string;
  onTone: "amber";
}) {
  if (!field || !field.ok) {
    return (
      <span className="rounded-full border border-soft bg-bg/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
        {onLabel}: unavailable
      </span>
    );
  }
  const on = field.value === "true";
  const tone = on
    ? onTone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : ""
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${tone}`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

function GuardrailRow({ g }: { g: GuardrailValue }) {
  const capNum = g.cap.ok ? Number(g.cap.value) : null;
  const curNum = g.current?.ok ? Number(g.current.value) : null;
  const ratio =
    capNum !== null && curNum !== null && capNum > 0
      ? Math.min(1, curNum / capNum)
      : null;

  return (
    <div className="rounded-xl border border-soft bg-bg/30 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm text-text">
          <span className="mr-2 font-mono text-xs text-accent-indigo">{g.n}</span>
          {g.label}
        </span>
        <span className="font-mono text-xs text-text-muted">
          {g.capLabel.toLowerCase()}{" "}
          {g.cap.ok ? (
            formatUnit(g.cap.value, g.capUnit)
          ) : (
            <Unavailable reason={g.cap.reason} />
          )}
          {g.current && (
            <>
              {" — "}
              {g.currentLabel?.toLowerCase()}{" "}
              {g.current.ok ? (
                <span className="text-text">
                  {formatUnit(g.current.value, g.currentUnit ?? "count")}
                </span>
              ) : (
                <Unavailable reason={g.current.reason} />
              )}
            </>
          )}
        </span>
      </div>
      {ratio !== null && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-soft/60">
          <div
            className={
              ratio > 0.8
                ? "h-full rounded-full bg-amber-400"
                : "h-full rounded-full bg-accent-indigo"
            }
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Activity({
  entries,
  chainId,
}: {
  entries: ActivityEntry[];
  chainId: number;
}) {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur sm:p-8">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        Activity — newest first
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
          No events from any vault in the scanned block range. When the agent
          trades, every intent the vault accepts lands here with a link to its
          transaction.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-soft/60">
          {entries.map((e) => (
            <li
              key={`${e.txHash}-${e.logIndex}`}
              className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-3 sm:gap-4"
            >
              <span className="font-mono text-[11px] tabular-nums text-text-muted">
                #{e.blockNumber}
              </span>
              <span className="min-w-0 text-[12px]">
                <span className="font-mono text-text">
                  {e.name ?? "unnamed event"}
                </span>
                {e.summary && (
                  <span className="ml-2 break-all font-mono text-text-muted">
                    {e.summary}
                  </span>
                )}
                {!e.name && e.topic0 && (
                  <span className="ml-2 break-all font-mono text-text-muted">
                    topic0 {e.topic0.slice(0, 10)}… — no provisional fragment
                    matched
                  </span>
                )}
              </span>
              <TxLink chainId={chainId} hash={e.txHash} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Unavailable({ reason }: { reason: string }) {
  return (
    <span title={reason} className="text-text-muted">
      unavailable
    </span>
  );
}

function ExplorerAddress({
  chainId,
  address,
  full,
}: {
  chainId: number;
  address: string;
  full?: boolean;
}) {
  const href = address ? explorerAddressUrl(chainId, address) : null;
  const label = full ? address : shortAddress(address);
  if (!href) return <span className="font-mono">{label}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="break-all font-mono text-text underline decoration-text-muted/40 underline-offset-4 transition-colors hover:decoration-text"
    >
      {label}
    </a>
  );
}

function TxLink({ chainId, hash }: { chainId: number; hash: string }) {
  const href = hash ? explorerTxUrl(chainId, hash) : null;
  if (!href) {
    return <span className="font-mono text-[11px] text-text-muted">—</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-mono text-[11px] text-text-muted transition-colors hover:text-text"
    >
      {shortAddress(hash)} ↗
    </a>
  );
}

/** bps → percent, counts as-is. Token amounts are handled separately. */
function formatUnit(raw: string, unit: string): string {
  if (unit === "bps") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return `${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}%`;
  }
  return raw;
}

function formatStateValue(
  key: string,
  raw: string,
  decimals: number | null,
  symbol: string | null
): string {
  if (key === "settlementToken") return shortAddress(raw);
  if (decimals === null) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  const scaled = n / 10 ** decimals;
  const formatted = scaled.toLocaleString("en-US", {
    maximumFractionDigits: scaled < 1 ? 6 : 2,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "unknown"
    : d.toLocaleTimeString("en-GB", { hour12: false });
}
