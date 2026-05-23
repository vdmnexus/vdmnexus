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
  title: "Agents on the rail — VDM Nexus",
  description:
    "Public directory of agents running on the VDM Nexus signed-inference rail. Every agent is an Ed25519 keypair, pays per call in USDC, and produces verifiable receipts of every inference call.",
  alternates: { canonical: "https://vdmnexus.com/agents" },
  openGraph: {
    title: "VDM Nexus — Agents on the rail",
    description:
      "Public directory of agents running on the signed-inference rail. Public, indexed, signed.",
    url: "https://vdmnexus.com/agents",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "VDM Nexus — Agents on the rail",
    description:
      "Public directory of agents running on the signed-inference rail.",
  },
};

type AgentRow = {
  pubkey: string;
  label: string | null;
  calls: number;
  total_spent_usdc: number;
  models_used: number;
  primary_model: string | null;
  last_call_at: string | null;
};

type Totals = {
  agents: number;
  calls: number;
  spent_usdc: number;
};

type TimeRange = "24h" | "7d" | "30d" | "all";
type NetworkFilter = "all" | "mainnet";
type Sort = "calls" | "spent" | "recent";

type Filters = {
  range: TimeRange;
  network: NetworkFilter;
  sort: Sort;
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

const SORT_LABELS: Record<Sort, string> = {
  calls: "Receipts",
  spent: "USDC spent",
  recent: "Recently active",
};

// Same mainnet filter pattern as /points + /api/pulse — keeps semantics
// consistent across the marketing surfaces.
const MAINNET_NETWORK_FILTER = [
  "receipt_json->payment->>network.like.solana:5eykt%",
  "receipt_json->payment->>network.eq.solana:mainnet",
  "receipt_json->payment->>network.eq.eip155:8453",
].join(",");

function parseFilters(raw: {
  since?: string | string[];
  network?: string | string[];
  sort?: string | string[];
}): Filters {
  const sinceVal = Array.isArray(raw.since) ? raw.since[0] : raw.since;
  const netVal = Array.isArray(raw.network) ? raw.network[0] : raw.network;
  const sortVal = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
  const range: TimeRange =
    sinceVal === "24h" || sinceVal === "7d" || sinceVal === "30d"
      ? sinceVal
      : "all";
  const network: NetworkFilter = netVal === "mainnet" ? "mainnet" : "all";
  const sort: Sort =
    sortVal === "spent" || sortVal === "recent" ? sortVal : "calls";
  return { range, network, sort };
}

// Cap on raw rows pulled per render (same reasoning as /points — Supabase
// project has aggregates disabled at the PostgREST layer so we group in JS).
const RAW_ROW_CAP = 10_000;
const DIRECTORY_LIMIT = 100;

async function fetchDirectory(filters: Filters): Promise<{
  rows: AgentRow[];
  totals: Totals;
}> {
  const supabase = getServiceClient();

  let logsQuery = supabase
    .from("inference_logs")
    .select("agent_pubkey, model, cost_usdc, created_at")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(RAW_ROW_CAP);

  if (filters.range !== "all") {
    const cutoff = new Date(
      Date.now() - TIME_RANGE_MS[filters.range]
    ).toISOString();
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
    model: string | null;
    cost_usdc: number | string | null;
    created_at: string;
  };
  type LabelRow = { pubkey: string; label: string | null };

  const logs = (logsRes.data ?? []) as unknown as LogRow[];
  const labels = new Map<string, string | null>();
  for (const a of (agentsRes.data ?? []) as unknown as LabelRow[]) {
    labels.set(a.pubkey, a.label);
  }

  type Accum = {
    calls: number;
    spent: number;
    last: string;
    modelCounts: Map<string, number>;
  };
  const acc = new Map<string, Accum>();

  for (const log of logs) {
    const cost =
      typeof log.cost_usdc === "string"
        ? Number(log.cost_usdc)
        : (log.cost_usdc ?? 0);
    const current = acc.get(log.agent_pubkey);
    if (current) {
      current.calls += 1;
      current.spent += cost;
      if (log.created_at > current.last) current.last = log.created_at;
      if (log.model) {
        current.modelCounts.set(
          log.model,
          (current.modelCounts.get(log.model) ?? 0) + 1
        );
      }
    } else {
      const modelCounts = new Map<string, number>();
      if (log.model) modelCounts.set(log.model, 1);
      acc.set(log.agent_pubkey, {
        calls: 1,
        spent: cost,
        last: log.created_at,
        modelCounts,
      });
    }
  }

  const allAgents: AgentRow[] = Array.from(acc.entries()).map(
    ([pubkey, v]) => {
      let primary: string | null = null;
      let primaryCount = 0;
      for (const [model, count] of v.modelCounts) {
        if (count > primaryCount) {
          primary = model;
          primaryCount = count;
        }
      }
      return {
        pubkey,
        label: labels.get(pubkey) ?? null,
        calls: v.calls,
        total_spent_usdc: v.spent,
        models_used: v.modelCounts.size,
        primary_model: primary,
        last_call_at: v.last,
      };
    }
  );

  const sorted = [...allAgents];
  if (filters.sort === "spent") {
    sorted.sort(
      (a, b) =>
        b.total_spent_usdc - a.total_spent_usdc || b.calls - a.calls
    );
  } else if (filters.sort === "recent") {
    sorted.sort((a, b) => {
      const at = a.last_call_at ? Date.parse(a.last_call_at) : 0;
      const bt = b.last_call_at ? Date.parse(b.last_call_at) : 0;
      return bt - at;
    });
  } else {
    sorted.sort(
      (a, b) =>
        b.calls - a.calls || b.total_spent_usdc - a.total_spent_usdc
    );
  }

  const rows = sorted.slice(0, DIRECTORY_LIMIT);

  const totals: Totals = {
    agents: allAgents.length,
    calls: logs.length,
    spent_usdc: allAgents.reduce((s, r) => s + r.total_spent_usdc, 0),
  };

  return { rows, totals };
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    since?: string;
    network?: string;
    sort?: string;
  }>;
}) {
  const filters = parseFilters(await searchParams);
  const { rows, totals } = await fetchDirectory(filters);

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-10 sm:pt-20">
        <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
          Public directory
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          Agents on the rail.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-text-muted sm:text-lg">
          Every Ed25519 agent that has called the signed-inference rail.
          Identity is the pubkey. Every call produces a verifiable receipt.
          Every settlement is on-chain. Public, indexed, signed.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/agents/about"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
          >
            What is a Nexus agent?
          </Link>
          <a
            href="https://docs.vdmnexus.com/docs/quickstart"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-3.5 py-1.5 font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            Spin up an agent →
          </a>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Agents active" value={totals.agents.toLocaleString()} />
          <StatCard label="Signed inferences" value={totals.calls.toLocaleString()} />
          <StatCard
            label="USDC spent"
            value={`$${formatUsdc(totals.spent_usdc)}`}
          />
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Beta — mainnet live since{" "}
          <span className="text-text">2026-05-21</span>. Numbers grow per
          call. Filter to <span className="text-text">Mainnet</span> for
          real-money activity only.
        </p>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-6">
        <FilterBar filters={filters} />
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        {rows.length === 0 ? <EmptyState /> : <Directory rows={rows} />}

        <p className="mt-6 max-w-3xl text-xs text-text-muted">
          Updated at most once per 60 seconds. Stats are derived from the
          public{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            inference_logs
          </code>{" "}
          table and reflect only successful calls. Click any agent for
          their full profile on Mission Control —{" "}
          <a
            href="https://console.vdmnexus.com"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            console.vdmnexus.com
          </a>{" "}
          — with receipt history, stats, and the ERC-8004 agent card.
          Per-agent points live at{" "}
          <Link
            href="/points"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            /points
          </Link>
          .
        </p>
      </section>

      <Footer />
    </main>
  );
}

function FilterBar({ filters }: { filters: Filters }) {
  function withFilter(next: Partial<Filters>): string {
    const merged: Filters = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.range !== "all") params.set("since", merged.range);
    if (merged.network !== "all") params.set("network", merged.network);
    if (merged.sort !== "calls") params.set("sort", merged.sort);
    const qs = params.toString();
    return qs ? `/agents?${qs}` : "/agents";
  }
  const ranges: TimeRange[] = ["24h", "7d", "30d", "all"];
  const sorts: Sort[] = ["calls", "spent", "recent"];
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
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Sort
        </span>
        {sorts.map((s) => (
          <Link
            key={s}
            href={withFilter({ sort: s })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filters.sort === s
                ? "bg-accent-indigo/20 text-text"
                : "text-text-muted hover:bg-bg/60 hover:text-text"
            )}
            prefetch={false}
          >
            {SORT_LABELS[s]}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 px-6 py-5 backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-text tabular-nums sm:text-4xl">
        {value}
      </div>
    </div>
  );
}

function Directory({ rows }: { rows: AgentRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
      {/* Desktop header */}
      <div className="hidden border-b border-soft px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted sm:grid sm:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_6rem_8rem_8rem] sm:gap-4">
        <div>#</div>
        <div>Agent</div>
        <div>Primary model</div>
        <div className="text-right">Receipts</div>
        <div className="text-right">USDC spent</div>
        <div className="text-right">Last call</div>
      </div>

      <ul className="divide-y divide-border/60">
        {rows.map((row, i) => (
          <FadeIn key={row.pubkey} delay={Math.min(i, 12) * 0.02}>
            <DirectoryRow row={row} rank={i + 1} />
          </FadeIn>
        ))}
      </ul>
    </div>
  );
}

function DirectoryRow({ row, rank }: { row: AgentRow; rank: number }) {
  const topThree = rank <= 3;

  return (
    <li className="px-6 py-4 transition-colors hover:bg-surface/80">
      {/* Mobile */}
      <div className="flex items-start justify-between gap-4 sm:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <RankBadge rank={rank} highlight={topThree} />
            <AgentIdentity row={row} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="tabular-nums">
              {row.calls.toLocaleString()} receipts
            </span>
            <span>·</span>
            <span className="tabular-nums">
              ${formatUsdc(row.total_spent_usdc)}
            </span>
            {row.primary_model ? (
              <>
                <span>·</span>
                <span className="truncate font-mono text-[11px]">
                  {row.primary_model}
                </span>
              </>
            ) : null}
            <span>·</span>
            <span>{formatRelative(row.last_call_at)}</span>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_6rem_8rem_8rem]">
        <RankBadge rank={rank} highlight={topThree} />
        <AgentIdentity row={row} />
        <div
          className="truncate font-mono text-xs text-text-muted"
          title={row.primary_model ?? undefined}
        >
          {row.primary_model ?? "—"}
        </div>
        <div className="text-right text-sm tabular-nums text-text">
          {row.calls.toLocaleString()}
        </div>
        <div className="text-right text-sm tabular-nums text-text-muted">
          ${formatUsdc(row.total_spent_usdc)}
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

function AgentIdentity({ row }: { row: AgentRow }) {
  // Mission Control is the canonical per-agent profile surface now.
  // Cross-domain link (apps/web → console.vdmnexus.com), so use <a>
  // rather than Next's <Link>.
  return (
    <a
      href={`https://console.vdmnexus.com/a/${row.pubkey}`}
      target="_blank"
      rel="noreferrer noopener"
      className="block min-w-0 transition-colors hover:[&_.pubkey]:text-accent-indigo"
    >
      <div
        className="pubkey truncate font-mono text-sm text-text transition-colors"
        title={row.pubkey}
      >
        {truncatePubkey(row.pubkey)}
      </div>
      {row.label ? (
        <div className="truncate text-xs text-text-muted">{row.label}</div>
      ) : null}
    </a>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 px-8 py-14 text-center backdrop-blur">
      <h2 className="text-xl font-semibold tracking-tight text-text">
        Be the first agent on the directory.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-text-muted">
        Spin up an Ed25519 agent, fund it with USDC, make one signed
        inference call against{" "}
        <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
          nexus.vdmnexus.com
        </code>
        . Your agent shows up here.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/agents/about"
          className="rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60 hover:bg-accent-indigo/10 sm:text-sm"
        >
          What's a Nexus agent?
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

function formatUsdc(value: number): string {
  if (value === 0) return "0.00";
  if (value < 0.0001) return value.toFixed(6);
  if (value < 0.01) return value.toFixed(4);
  if (value < 1) return value.toFixed(4);
  if (value < 1000) return value.toFixed(2);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
