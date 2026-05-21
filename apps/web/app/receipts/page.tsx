import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
// Public-facing Nexus origin for the API export links. Env-overridable so
// preview deployments can point at staging without hardcoding.
const NEXUS_PUBLIC =
  process.env.NEXT_PUBLIC_NEXUS_URL?.replace(/\/$/, "") ??
  "https://nexus.vdmnexus.com";

type Row = {
  id: number;
  agent_pubkey: string;
  upstream: string | null;
  model: string | null;
  cost_usdc: number | null;
  tx_signature: string | null;
  receipt_json: Record<string, unknown> | null;
  created_at: string;
};

export const metadata: Metadata = {
  title: "Public receipts — VDM Nexus",
  description:
    "Every signed inference call on VDM Nexus, public. Cryptographic receipts with sha256 hashes, model, cost, and on-chain payment anchor. Prompts and responses stay private to the agent.",
  alternates: { canonical: "https://vdmnexus.com/receipts" },
  openGraph: {
    title: "Public receipts — VDM Nexus",
    description:
      "The live ledger of agent work. Every signed inference call, cryptographically receipted.",
    url: "https://vdmnexus.com/receipts",
    siteName: "VDM Nexus",
    type: "website",
  },
};

async function loadReceipts(cursor: string | null): Promise<Row[]> {
  const supabase = getServiceClient();
  let query = supabase
    .from("inference_logs")
    .select(
      "id, agent_pubkey, upstream, model, cost_usdc, tx_signature, receipt_json, created_at"
    )
    .eq("status", "success")
    .not("receipt_json", "is", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as Row[];
}

function truncateMiddle(s: string, head = 6, tail = 6): string {
  if (!s) return "";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function formatCost(usdc: number | null): string {
  if (usdc == null) return "—";
  if (usdc < 0.0001) return "<$0.0001";
  return `$${usdc.toFixed(6)}`;
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function networkFromReceipt(r: Record<string, unknown> | null): string | null {
  if (!r || typeof r !== "object") return null;
  const payment = (r as { payment?: { network?: unknown } }).payment;
  if (!payment || typeof payment !== "object") return null;
  const net = payment.network;
  return typeof net === "string" ? net : null;
}

function explorerUrl(sig: string, network: string | null): string {
  // Genesis-hash form: 5eykt… is mainnet, EtWTRABZ… is devnet (per @x402/svm).
  const isDevnet = network ? network.includes("devnet") || network.includes("EtWTRABZ") : false;
  return isDevnet
    ? `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    : `https://explorer.solana.com/tx/${sig}`;
}

export default async function ReceiptsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const rows = await loadReceipts(cursor ?? null);
  const nextCursor =
    rows.length === PAGE_SIZE ? rows[rows.length - 1]?.created_at ?? null : null;

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-6xl px-6 pt-14 pb-6 sm:pt-20">
        <div className="flex flex-col items-start gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-text">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo" />
            Public ledger
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Every signed inference call on VDM Nexus.
          </h1>
          <p className="max-w-2xl text-balance text-sm text-text-muted sm:text-base">
            Hashes-only public surface. Each row is a real cryptographic
            receipt — model, cost, on-chain payment, operator signature.
            The prompt and response text live with the agent that made the
            call; only the sha256 hashes are public.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-text-muted">
            <a
              href={`${NEXUS_PUBLIC}/api/v1/receipts/recent?format=ndjson`}
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-3 py-1.5 font-mono hover:border-accent-indigo/60"
            >
              ndjson export ↗
            </a>
            <a
              href={`${NEXUS_PUBLIC}/api/v1/receipts/recent`}
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-3 py-1.5 font-mono hover:border-accent-indigo/60"
            >
              json api ↗
            </a>
            <a
              href="https://docs.vdmnexus.com/docs/spec/sir-v2"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-3 py-1.5 font-mono hover:border-accent-indigo/60"
            >
              receipt spec ↗
            </a>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-16">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ul className="grid gap-3">
              {rows.map((r) => (
                <ReceiptRow key={r.id} row={r} />
              ))}
            </ul>

            <div className="mt-8 flex items-center justify-between text-xs text-text-muted">
              <span>
                Showing {rows.length} {rows.length === 1 ? "receipt" : "receipts"}
              </span>
              {nextCursor ? (
                <Link
                  href={`/receipts?cursor=${encodeURIComponent(nextCursor)}`}
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-3 py-1.5 text-sm font-medium text-text hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Older →
                </Link>
              ) : null}
            </div>
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}

function ReceiptRow({ row }: { row: Row }) {
  const network = networkFromReceipt(row.receipt_json);
  const isDevnet = network ? network.includes("devnet") || network.includes("EtWTRABZ") : false;
  // Structure: outer <div> wraps the row, the main clickable area is a
  // single <Link>, the tx-signature link is a sibling <a> *outside* the
  // Link. Two reasons:
  //   1. Nested <a> inside <Link> is invalid HTML and triggers hydration
  //      mismatches.
  //   2. The previous fix used onClick={e.stopPropagation()} on the inner
  //      anchor to keep the card click from firing — but onClick handlers
  //      in a React Server Component throw "Event handlers cannot be passed
  //      to Client Component props" at render time, which is what was
  //      crashing /receipts in production (digest 2690722458).
  return (
    <li className="group relative flex flex-col gap-3 rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur transition-colors hover:border-accent-indigo/40 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={`/r/${row.id}`}
        aria-label={`Receipt #${row.id}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-indigo"
      />
      <div className="relative z-10 flex min-w-0 flex-col gap-1.5 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-soft bg-bg/60 px-2 py-0.5 font-mono uppercase tracking-[0.12em] text-text-muted">
            #{row.id}
          </span>
          {network ? (
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                isDevnet
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200"
              }`}
            >
              {isDevnet ? "devnet" : "mainnet"}
            </span>
          ) : null}
          {row.model ? (
            <code className="truncate font-mono text-text">{row.model}</code>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="font-mono text-text" title={row.agent_pubkey}>
            {truncateMiddle(row.agent_pubkey, 6, 6)}
          </span>
          <span aria-hidden className="text-text-muted/40">
            ·
          </span>
          <span className="font-mono">{formatCost(row.cost_usdc)}</span>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex flex-col items-start gap-1 text-xs text-text-muted sm:items-end">
        <time
          dateTime={row.created_at}
          className="font-mono"
          suppressHydrationWarning
        >
          {formatAgo(row.created_at)}
        </time>
        {row.tx_signature ? (
          <a
            href={explorerUrl(row.tx_signature, network)}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto font-mono text-text-muted hover:text-text"
            title={row.tx_signature}
          >
            tx {truncateMiddle(row.tx_signature, 4, 4)} ↗
          </a>
        ) : null}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-soft bg-surface/60 p-12 text-center backdrop-blur">
      <p className="text-sm text-text-muted">
        No public receipts yet. Run an inference call against{" "}
        <code className="font-mono text-text">
          https://nexus.vdmnexus.com/api/v1
        </code>{" "}
        and yours will land here.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/playground"
          className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text hover:border-accent-indigo hover:bg-accent-indigo/30"
        >
          Open the playground
        </Link>
        <a
          href="https://docs.vdmnexus.com/docs/quickstart"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2 text-sm font-medium text-text-muted hover:border-accent-indigo/40 hover:text-text"
        >
          Read the quickstart
        </a>
      </div>
    </div>
  );
}
