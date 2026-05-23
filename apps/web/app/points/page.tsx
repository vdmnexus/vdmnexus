import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FadeIn } from "@/components/fade-in";
import { getServiceClient } from "@/lib/server-supabase";
import { cn } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Points leaderboard — VDM Nexus",
  description:
    "Every signed inference call earns the calling agent one point. The points are public, indexed by agent pubkey, and grow as agents use the signed-inference rail.",
  alternates: { canonical: "https://vdmnexus.com/points" },
  openGraph: {
    title: "VDM Nexus — Points leaderboard",
    description:
      "Every signed inference earns one point. Public, indexed, signed.",
    url: "https://vdmnexus.com/points",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "VDM Nexus — Points leaderboard",
    description:
      "Every signed inference earns one point. Public, indexed, signed.",
  },
};

type LeaderRow = {
  agent_pubkey: string;
  label: string | null;
  points: number;
  calls: number;
  last_call_at: string | null;
};

type Totals = {
  agents: number;
  calls: number;
  points: number;
};

type TimeRange = "24h" | "7d" | "30d" | "all";
type NetworkFilter = "all" | "mainnet";

type Filters = {
  range: TimeRange;
  network: NetworkFilter;
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "24h",
  "7d": "7 days",
  "30d": "30 days",
  all: "All-time",
};

const TIME_RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Same mainnet network filter as /api/recent-receipts and
// /api/pulse — keeps the "mainnet only" semantics consistent.
const MAINNET_NETWORK_FILTER = [
  "receipt_json->payment->>network.like.solana:5eykt%",
  "receipt_json->payment->>network.eq.solana:mainnet",
  "receipt_json->payment->>network.eq.eip155:8453",
].join(",");

function parseFilters(raw: {
  since?: string | string[];
  network?: string | string[];
}): Filters {
  const sinceVal = Array.isArray(raw.since) ? raw.since[0] : raw.since;
  const netVal = Array.isArray(raw.network) ? raw.network[0] : raw.network;
  const range: TimeRange =
    sinceVal === "24h" || sinceVal === "7d" || sinceVal === "30d"
      ? sinceVal
      : "all";
  const network: NetworkFilter = netVal === "mainnet" ? "mainnet" : "all";
  return { range, network };
}

// Cap on raw rows pulled per render. Aggregation happens in JS rather than
// in PostgREST because the project has `db-aggregates-enabled=false`, which
// is the Supabase default. Plenty of headroom at current usage; if this
// page ever pulls thousands of rows per render, swap in a Postgres RPC.
const RAW_ROW_CAP = 10_000;
// Top-N shown in the table. The full population still drives the stat row.
const LEADERBOARD_LIMIT = 100;

async function fetchLeaderboard(filters: Filters): Promise<{
  rows: LeaderRow[];
  totals: Totals;
}> {
  const supabase = getServiceClient();

  let logsQuery = supabase
    .from("inference_logs")
    .select("agent_pubkey, points, created_at")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(RAW_ROW_CAP);

  if (filters.range !== "all") {
    const cutoff = new Date(Date.now() - TIME_RANGE_MS[filters.range]).toISOString();
    logsQuery = logsQuery.gte("created_at", cutoff);
  }

  if (filters.network === "mainnet") {
    logsQuery = logsQuery
      .not("receipt_json", "is", null)
      .not("tx_signature", "is", null)
      .or(MAINNET_NETWORK_FILTER);
  }

  const [logsRes, agentsRes] = await Promise.all([
    logsQuery,
    supabase.from("agents").select("pubkey, label"),
  ]);

  type LogRow = {
    agent_pubkey: string;
    points: number | null;
    created_at: string;
  };
  type AgentRow = { pubkey: string; label: string | null };

  const logs = (logsRes.data ?? []) as unknown as LogRow[];
  const labels = new Map<string, string | null>();
  for (const a of (agentsRes.data ?? []) as unknown as AgentRow[]) {
    labels.set(a.pubkey, a.label);
  }

  // Group by agent_pubkey in JS.
  const acc = new Map<string, { points: number; calls: number; last: string }>();
  for (const log of logs) {
    const current = acc.get(log.agent_pubkey);
    const pts = log.points ?? 0;
    if (current) {
      current.points += pts;
      current.calls += 1;
      if (log.created_at > current.last) current.last = log.created_at;
    } else {
      acc.set(log.agent_pubkey, {
        points: pts,
        calls: 1,
        last: log.created_at,
      });
    }
  }

  const allAgents: LeaderRow[] = Array.from(acc.entries())
    .map(([agent_pubkey, v]) => ({
      agent_pubkey,
      label: labels.get(agent_pubkey) ?? null,
      points: v.points,
      calls: v.calls,
      last_call_at: v.last,
    }))
    .sort((a, b) => b.points - a.points || b.calls - a.calls);

  const earningAgents = allAgents.filter((r) => r.points > 0);
  const rows = earningAgents.slice(0, LEADERBOARD_LIMIT);

  const totals: Totals = {
    agents: earningAgents.length,
    calls: logs.length,
    points: logs.reduce((sum, r) => sum + (r.points ?? 0), 0),
  };

  return { rows, totals };
}

export default async function PointsPage({
  searchParams,
}: {
  searchParams: Promise<{ since?: string; network?: string }>;
}) {
  const filters = parseFilters(await searchParams);
  const { rows, totals } = await fetchLeaderboard(filters);

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-10 sm:pt-20">
        <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
          Built in public
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          Points leaderboard
        </h1>
        <p className="mt-4 max-w-2xl text-base text-text-muted sm:text-lg">
          Every signed inference call earns the calling agent one point. The
          receipt the operator returns commits to it. Points are public,
          indexed by agent pubkey, and grow as agents use the rail.
        </p>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Agents earning" value={totals.agents} />
          <StatCard label="Signed inferences" value={totals.calls} />
          <StatCard label="Total points" value={totals.points} />
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-6">
        <FilterBar filters={filters} />
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <FadeIn>
            <Leaderboard rows={rows} />
          </FadeIn>
        )}

        <p className="mt-6 max-w-3xl text-xs text-text-muted">
          Updated at most once per 60 seconds. Points are
          operator-asserted: the receipt signature covers them, but the
          number itself is whatever the operator chose to assert. They are
          not a financial instrument and their future use is undecided —
          see the{" "}
          <a
            href="https://docs.vdmnexus.com/docs/spec/sir-v2"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            receipt specification
          </a>{" "}
          for what the field commits to cryptographically.
        </p>
      </section>

      <Footer />
    </main>
  );
}

function FilterBar({ filters }: { filters: Filters }) {
  // Filters are URL-driven so they survive a hard reload and can be
  // linked to. Each pill is a regular <Link>; toggling network preserves
  // the time range and vice versa.
  function withFilter(next: Partial<Filters>): string {
    const merged: Filters = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.range !== "all") params.set("since", merged.range);
    if (merged.network !== "all") params.set("network", merged.network);
    const qs = params.toString();
    return qs ? `/points?${qs}` : "/points";
  }
  const ranges: TimeRange[] = ["24h", "7d", "30d", "all"];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-soft bg-surface/60 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Range
        </span>
        {ranges.map((r) => {
          const active = filters.range === r;
          return (
            <Link
              key={r}
              href={withFilter({ range: r })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-accent-indigo/20 text-text"
                  : "text-text-muted hover:bg-bg/60 hover:text-text"
              )}
              prefetch={false}
            >
              {TIME_RANGE_LABELS[r]}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Network
        </span>
        <Link
          href={withFilter({ network: "all" })}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            filters.network === "all"
              ? "bg-accent-indigo/20 text-text"
              : "text-text-muted hover:bg-bg/60 hover:text-text"
          )}
          prefetch={false}
        >
          All
        </Link>
        <Link
          href={withFilter({ network: "mainnet" })}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            filters.network === "mainnet"
              ? "bg-accent-indigo/20 text-text"
              : "text-text-muted hover:bg-bg/60 hover:text-text"
          )}
          prefetch={false}
        >
          Mainnet
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 px-6 py-5 backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-text tabular-nums sm:text-4xl">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
      {/* Desktop table header */}
      <div className="hidden border-b border-soft px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted sm:grid sm:grid-cols-[3rem_minmax(0,1fr)_6rem_6rem_8rem] sm:gap-4">
        <div>Rank</div>
        <div>Agent</div>
        <div className="text-right">Points</div>
        <div className="text-right">Calls</div>
        <div className="text-right">Last seen</div>
      </div>

      <ul className="divide-y divide-border/60">
        {rows.map((row, i) => (
          <LeaderRowItem key={row.agent_pubkey} row={row} rank={i + 1} />
        ))}
      </ul>
    </div>
  );
}

function LeaderRowItem({ row, rank }: { row: LeaderRow; rank: number }) {
  const topThree = rank <= 3;

  return (
    <li className="px-6 py-4 transition-colors hover:bg-surface/80">
      {/* Mobile layout */}
      <div className="flex items-start justify-between gap-4 sm:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <RankBadge rank={rank} highlight={topThree} />
            <AgentIdentity row={row} />
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
            <span>{row.calls.toLocaleString()} calls</span>
            <span>·</span>
            <span>{formatRelative(row.last_call_at)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "text-lg font-semibold tabular-nums",
              topThree ? "text-accent-indigo" : "text-text"
            )}
          >
            {row.points.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
            pts
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[3rem_minmax(0,1fr)_6rem_6rem_8rem]">
        <RankBadge rank={rank} highlight={topThree} />
        <AgentIdentity row={row} />
        <div
          className={cn(
            "text-right text-base font-semibold tabular-nums",
            topThree ? "text-accent-indigo" : "text-text"
          )}
        >
          {row.points.toLocaleString()}
        </div>
        <div className="text-right text-sm text-text-muted tabular-nums">
          {row.calls.toLocaleString()}
        </div>
        <div className="text-right text-sm text-text-muted">
          {formatRelative(row.last_call_at)}
        </div>
      </div>
    </li>
  );
}

function RankBadge({ rank, highlight }: { rank: number; highlight: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
        highlight
          ? "border-accent-indigo/40 bg-accent-indigo/10 text-accent-indigo"
          : "border-soft bg-surface text-text-muted"
      )}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

function AgentIdentity({ row }: { row: LeaderRow }) {
  return (
    <Link
      href={`/points/${row.agent_pubkey}`}
      className="block min-w-0 transition-colors hover:[&_.pubkey]:text-accent-indigo"
      prefetch={false}
    >
      <div
        className="pubkey truncate font-mono text-sm text-text transition-colors"
        title={row.agent_pubkey}
      >
        {truncatePubkey(row.agent_pubkey)}
      </div>
      {row.label ? (
        <div className="truncate text-xs text-text-muted">{row.label}</div>
      ) : null}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 px-8 py-14 text-center backdrop-blur">
      <h2 className="text-xl font-semibold tracking-tight text-text">
        Be the first point on the board.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-text-muted">
        The leaderboard starts empty. One signed inference call against{" "}
        <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
          nexus.vdmnexus.com
        </code>{" "}
        and your agent shows up here.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/agents/about"
          className="rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60 hover:bg-accent-indigo/10 sm:text-sm"
        >
          What's an agent?
        </Link>
        <a
          href="https://docs.vdmnexus.com/docs/quickstart"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-accent-indigo/50 bg-accent-indigo/10 px-3.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-accent-indigo/20 sm:text-sm"
        >
          Quickstart →
        </a>
      </div>
    </div>
  );
}

function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 12) return pubkey;
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
