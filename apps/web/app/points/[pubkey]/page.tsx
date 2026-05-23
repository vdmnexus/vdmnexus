import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Solana pubkeys are base58 with strict alphabet & length bounds.
const PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const RECENT_LIMIT = 50;

type AgentStats = {
  label: string | null;
  points: number;
  calls: number;
  total_cost_usdc: number;
  first_call_at: string | null;
  last_call_at: string | null;
};

type ReceiptCard = {
  id: string;
  model: string | null;
  cost_usdc: number | null;
  has_tx: boolean;
  network: string | null;
  created_at: string;
};

async function loadAgent(pubkey: string): Promise<{
  stats: AgentStats;
  receipts: ReceiptCard[];
} | null> {
  const supabase = getServiceClient();

  // Stats — pull all successful logs for this agent. JS aggregation keeps
  // parity with /points (which also aggregates client-side because the
  // project has db-aggregates-enabled=false).
  const [logsRes, agentRes] = await Promise.all([
    supabase
      .from("inference_logs")
      .select("id, model, cost_usdc, tx_signature, receipt_json, created_at, points")
      .eq("status", "success")
      .eq("agent_pubkey", pubkey)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("agents")
      .select("label")
      .eq("pubkey", pubkey)
      .maybeSingle(),
  ]);

  type LogRow = {
    id: string;
    model: string | null;
    cost_usdc: number | null;
    tx_signature: string | null;
    receipt_json: Record<string, unknown> | null;
    created_at: string;
    points: number | null;
  };

  const logs = (logsRes.data ?? []) as unknown as LogRow[];
  if (logs.length === 0 && !agentRes.data) return null;

  // The receipts slice (most recent N) — used to render the card list.
  const receipts: ReceiptCard[] = logs.map((row) => {
    const payment = row.receipt_json?.payment as
      | { network?: unknown }
      | undefined;
    const network =
      payment && typeof payment.network === "string" ? payment.network : null;
    return {
      id: String(row.id),
      model: row.model,
      cost_usdc: row.cost_usdc != null ? Number(row.cost_usdc) : null,
      has_tx: row.tx_signature != null,
      network,
      created_at: row.created_at,
    };
  });

  // Full counts for the stat row — pull aggregates from a second query so
  // the lifetime numbers aren't capped at RECENT_LIMIT.
  const totalsRes = await supabase
    .from("inference_logs")
    .select("cost_usdc, points, created_at")
    .eq("status", "success")
    .eq("agent_pubkey", pubkey);

  type TotalRow = {
    cost_usdc: number | null;
    points: number | null;
    created_at: string;
  };
  const allRows = (totalsRes.data ?? []) as unknown as TotalRow[];

  const totalCost = allRows.reduce(
    (s, r) => s + (r.cost_usdc != null ? Number(r.cost_usdc) : 0),
    0
  );
  const totalPoints = allRows.reduce((s, r) => s + (r.points ?? 0), 0);
  const sortedTimes = allRows
    .map((r) => r.created_at)
    .filter(Boolean)
    .sort();
  const firstAt = sortedTimes[0] ?? null;
  const lastAt = sortedTimes[sortedTimes.length - 1] ?? null;

  return {
    stats: {
      label: (agentRes.data?.label as string | null) ?? null,
      points: totalPoints,
      calls: allRows.length,
      total_cost_usdc: totalCost,
      first_call_at: firstAt,
      last_call_at: lastAt,
    },
    receipts,
  };
}

function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 12) return pubkey;
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}): Promise<Metadata> {
  const { pubkey } = await params;
  if (!PUBKEY_REGEX.test(pubkey)) {
    return { title: "Agent not found — VDM Nexus", robots: { index: false } };
  }
  const short = truncatePubkey(pubkey);
  const title = `Agent ${short} — Points · VDM Nexus`;
  const description = `Signed inferences, total spend, and recent receipts for agent ${short}. Public, on-chain-anchored.`;
  return {
    title,
    description,
    alternates: { canonical: `https://vdmnexus.com/points/${pubkey}` },
    openGraph: {
      title,
      description,
      url: `https://vdmnexus.com/points/${pubkey}`,
      siteName: "VDM Nexus",
      type: "profile",
    },
    twitter: {
      card: "summary",
      site: "@vdmnexus",
      title,
      description,
    },
  };
}

export default async function AgentDrillDownPage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;
  if (!PUBKEY_REGEX.test(pubkey)) notFound();
  const data = await loadAgent(pubkey);
  if (!data) notFound();
  const { stats, receipts } = data;

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-5xl px-6 pt-12 pb-6 sm:pt-16">
        <Link
          href="/points"
          className="text-xs text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
          prefetch={false}
        >
          ← Back to leaderboard
        </Link>
        <h1 className="mt-4 break-all font-mono text-2xl text-text sm:text-3xl">
          {pubkey}
        </h1>
        {stats.label ? (
          <p className="mt-2 text-sm text-text-muted">{stats.label}</p>
        ) : null}
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-6 pb-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Points" value={stats.points.toLocaleString()} />
          <Stat
            label="Signed calls"
            value={stats.calls.toLocaleString()}
          />
          <Stat
            label="USDC spent"
            value={`$${stats.total_cost_usdc.toFixed(4)}`}
          />
          <Stat
            label="First seen"
            value={formatDateOnly(stats.first_call_at)}
          />
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
            Recent receipts
          </h2>
          <span className="text-xs text-text-muted">
            Latest {receipts.length} of {stats.calls.toLocaleString()}
          </span>
        </div>
        {receipts.length === 0 ? (
          <div className="rounded-2xl border border-soft bg-surface/60 px-6 py-12 text-center backdrop-blur">
            <p className="text-sm text-text-muted">
              No signed inferences yet for this agent.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
            {receipts.map((r) => (
              <li
                key={r.id}
                className="border-b border-soft/60 last:border-b-0"
              >
                <Link
                  href={`/r/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface/80"
                  prefetch={false}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-text">
                        {r.id.slice(0, 12)}…
                      </code>
                      {r.network ? (
                        <NetworkBadge network={r.network} />
                      ) : null}
                      {r.has_tx ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                          on-chain
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 truncate text-xs text-text-muted">
                      {r.model ?? "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-right">
                    <div>
                      <div className="font-mono text-sm tabular-nums text-text">
                        {r.cost_usdc != null
                          ? `$${r.cost_usdc.toFixed(6)}`
                          : "—"}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-text-muted">
                        cost
                      </div>
                    </div>
                    <div className="hidden text-xs text-text-muted sm:block">
                      {formatRelative(r.created_at)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 max-w-2xl text-xs text-text-muted">
          Receipts older than the most recent {RECENT_LIMIT} for this
          agent aren&apos;t paginated yet — drop into{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[11px] text-text">
            inference_logs
          </code>{" "}
          via the public Supabase read-only ref if you need the full set.
        </p>
      </section>

      <Footer />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-soft bg-surface/60 px-4 py-3 backdrop-blur">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-text sm:text-2xl">
        {value}
      </div>
    </div>
  );
}

function NetworkBadge({ network }: { network: string }) {
  const lower = network.toLowerCase();
  const label = (() => {
    if (lower.includes("devnet") || lower.includes("etwtrabz")) return "devnet";
    if (lower.startsWith("solana:")) return "mainnet";
    if (lower === "eip155:84532") return "base sepolia";
    if (lower === "eip155:8453") return "base";
    return network;
  })();
  const isMainnet = label === "mainnet" || label === "base";
  return (
    <span
      className={
        "rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] " +
        (isMainnet
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")
      }
    >
      {label}
    </span>
  );
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

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const d = new Date(t);
  return d.toISOString().slice(0, 10);
}
