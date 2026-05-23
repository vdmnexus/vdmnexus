"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PolymarketAgentState,
  PolymarketBet,
  PredictionsSummary,
} from "@/lib/polymarket-types";
import { summarise } from "@/lib/polymarket-types";

const POLL_MS = 60_000;

export function PredictionsView({
  initialBets,
  initialState,
}: {
  initialBets: PolymarketBet[];
  initialState: PolymarketAgentState;
}) {
  const [bets, setBets] = useState<PolymarketBet[]>(initialBets);
  const [state, setState] = useState<PolymarketAgentState>(initialState);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const summary: PredictionsSummary = useMemo(
    () => summarise(bets, state),
    [bets, state]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/predictions", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        bets?: PolymarketBet[];
        state?: PolymarketAgentState;
      };
      if (data.ok && data.bets && data.state) {
        setBets(data.bets);
        setState(data.state);
      }
    } catch {
      // ignore; next poll will retry.
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (bets.length === 0) {
    return (
      <div className="space-y-6">
        <PauseBanner state={state} />
        <SummaryCards summary={summary} />
        <section className="rounded-2xl border border-soft bg-surface/60 p-10 text-center">
          <p className="text-sm text-text-muted">
            Agent funded with ${summary.initial_bankroll_usdc.toFixed(0)} USDC.
            <br />
            First bet appears here when the next target market opens.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PauseBanner state={state} />
      <SummaryCards summary={summary} />
      <section className="overflow-hidden rounded-2xl border border-soft bg-surface/60">
        <header className="flex items-center justify-between border-b border-soft px-6 py-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
            Recent bets
          </h2>
          <span className="text-[11px] text-text-muted">live · 60s refresh</span>
        </header>
        <ol className="divide-y divide-soft">
          {bets.map((b) => (
            <BetRow
              key={b.id}
              bet={b}
              expanded={expanded.has(b.id)}
              onToggle={() => toggle(b.id)}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}

function PauseBanner({ state }: { state: PolymarketAgentState }) {
  if (!state.paused) return null;
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
      <strong className="font-semibold">Agent paused.</strong>
      <span className="ml-2 text-amber-200/90">
        {state.pause_reason ?? "no reason given"}
      </span>
    </div>
  );
}

function SummaryCards({ summary }: { summary: PredictionsSummary }) {
  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <SummaryCard
        label="Bankroll"
        value={`$${summary.current_bankroll_usdc.toFixed(2)}`}
        sub={`from $${summary.initial_bankroll_usdc.toFixed(0)} initial`}
      />
      <SummaryCard
        label="Realised PnL"
        value={`${summary.total_pnl_usdc >= 0 ? "+" : ""}$${summary.total_pnl_usdc.toFixed(2)}`}
        sub={`${summary.resolved_bets} resolved`}
        positive={summary.total_pnl_usdc > 0}
        negative={summary.total_pnl_usdc < 0}
      />
      <SummaryCard
        label="Win rate"
        value={
          summary.win_rate == null
            ? "—"
            : `${(summary.win_rate * 100).toFixed(0)}%`
        }
        sub={`${summary.wins}W / ${summary.losses}L · ${summary.invalids} invalid`}
      />
      <SummaryCard
        label="Open positions"
        value={summary.open_bets.toString()}
        sub={`${summary.total_bets} total · ${summary.failed_bets} failed`}
      />
      <SummaryCard
        label="Brier score"
        value={summary.brier_score == null ? "—" : summary.brier_score.toFixed(3)}
        sub="lower is better"
      />
      <SummaryCard
        label="Bets today"
        value={summary.bets_today.toString()}
        sub="5/day cap"
      />
      <SummaryCard
        label="Total staked"
        value={`$${summary.total_staked_usdc.toFixed(2)}`}
        sub="all-time"
      />
      <SummaryCard
        label="Status"
        value={summary.paused ? "PAUSED" : "RUNNING"}
        sub={summary.paused ? "guard tripped" : "scan every 4h"}
        negative={summary.paused}
        positive={!summary.paused}
      />
    </section>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub: string;
  positive?: boolean;
  negative?: boolean;
}) {
  let valueColor = "text-text";
  if (positive) valueColor = "text-emerald-300";
  else if (negative) valueColor = "text-rose-300";

  return (
    <div className="rounded-xl border border-soft bg-surface/50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-text-muted">{sub}</p>
    </div>
  );
}

function BetRow({
  bet,
  expanded,
  onToggle,
}: {
  bet: PolymarketBet;
  expanded: boolean;
  onToggle: () => void;
}) {
  const stake = Number(bet.stake_usdc);
  const price = Number(bet.price);
  const pnl = bet.pnl_usdc == null ? null : Number(bet.pnl_usdc);
  const conf = bet.confidence == null ? null : Number(bet.confidence);

  const sideClass =
    bet.side === "YES" ? "text-emerald-300" : "text-rose-300";

  let statusClass = "border-soft text-text-muted";
  if (bet.status === "open") statusClass = "border-accent-indigo/60 text-accent-indigo";
  else if (bet.status === "resolved")
    statusClass =
      pnl != null && pnl > 0
        ? "border-emerald-500/50 text-emerald-300"
        : pnl != null && pnl < 0
          ? "border-rose-500/50 text-rose-300"
          : "border-soft text-text-muted";
  else if (bet.status === "failed") statusClass = "border-amber-500/50 text-amber-300";

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text leading-snug">{bet.market_question}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
            <span>{new Date(bet.created_at).toLocaleString("en-US")}</span>
            {bet.market_category && <span>· {bet.market_category}</span>}
            <span className={`rounded-full border px-2 py-0.5 ${statusClass}`}>
              {bet.status}
            </span>
            <a
              href={`https://vdmnexus.com/r/${bet.receipt_id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-soft px-2 py-0.5 hover:border-accent-indigo/60"
            >
              receipt ↗
            </a>
            {bet.tx_hash && (
              <a
                href={`https://polygonscan.com/tx/${bet.tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-soft px-2 py-0.5 hover:border-accent-indigo/60"
              >
                tx ↗
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-baseline gap-4 tabular-nums">
          <div className="text-right">
            <p className={`text-sm font-semibold ${sideClass}`}>
              {bet.side} @ {price.toFixed(3)}
            </p>
            <p className="text-[11px] text-text-muted">
              ${stake.toFixed(2)} stake
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-text">
              {conf == null ? "—" : `${(conf * 100).toFixed(0)}%`}
            </p>
            <p className="text-[11px] text-text-muted">conf</p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-semibold ${
                pnl == null
                  ? "text-text-muted"
                  : pnl > 0
                    ? "text-emerald-300"
                    : pnl < 0
                      ? "text-rose-300"
                      : "text-text-muted"
              }`}
            >
              {pnl == null ? "—" : `${pnl > 0 ? "+" : ""}$${pnl.toFixed(2)}`}
            </p>
            <p className="text-[11px] text-text-muted">pnl</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-3 text-[11px] uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
      >
        {expanded ? "hide reasoning" : "show reasoning"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-lg border border-soft bg-bg/40 p-4">
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-muted">
            {bet.reasoning_text}
          </pre>
          {bet.failure_reason && (
            <p className="text-[12px] text-amber-300">
              <strong>Order failure:</strong> {bet.failure_reason}
            </p>
          )}
          <p className="text-[10px] text-text-muted">
            model: <code>{bet.model}</code> · agent:{" "}
            <code>{bet.agent_pubkey.slice(0, 8)}…</code>
          </p>
        </div>
      )}
    </li>
  );
}
