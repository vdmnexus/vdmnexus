import Link from "next/link";
import { Card, ComingSoonBadge } from "@/components/card";
import { BetaPill } from "@/components/beta-pill";
import { CopyButton } from "@/components/copy-button";
import type { AgentProfileData, AgentReceipt } from "@/lib/agent";
import { classify, type AgentClassification } from "@/lib/classification";

export type AgentProfileViewProps = {
  data: AgentProfileData;
  /** Renders the "Your agent" header chip + dashboard-only sections. */
  authenticated?: boolean;
};

export function AgentProfileView({
  data,
  authenticated = false,
}: AgentProfileViewProps) {
  const classification = classify(data.pubkey);

  return (
    <>
      <ProfileHeader data={data} authenticated={authenticated} />
      <StatsGrid data={data} />
      <ClassificationStats data={data} classification={classification} />
      <RecentReceipts receipts={data.recent_receipts} total={data.total_calls} />
      <ReputationCard data={data} />
      {authenticated ? <DashboardOnly /> : <PublicCTA />}
    </>
  );
}

function ProfileHeader({
  data,
  authenticated,
}: {
  data: AgentProfileData;
  authenticated: boolean;
}) {
  const short = truncatePubkey(data.pubkey);
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pt-12 pb-6 sm:pt-16">
      <div className="flex flex-wrap items-center gap-2">
        <BetaPill />
        {authenticated ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Your agent
          </span>
        ) : (
          <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted">
            Public profile
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1
          className="break-all font-mono text-2xl text-text sm:text-3xl"
          title={data.pubkey}
        >
          {short}
        </h1>
        <CopyButton value={data.pubkey} label="Copy pubkey" />
      </div>

      {data.label ? (
        <p className="mt-2 text-sm text-text-muted">{data.label}</p>
      ) : null}

      <p className="mt-3 text-xs text-text-muted">
        Active since {formatDateOnly(data.first_call_at)} · Last call{" "}
        {formatRelative(data.last_call_at)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link
          href={`/a/${data.pubkey}/erc-8004`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-2.5 py-1 font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          ERC-8004 card ↗
        </Link>
        <a
          href={`https://vdmnexus.com/points/${data.pubkey}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-2.5 py-1 font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          Points page ↗
        </a>
      </div>
    </section>
  );
}

function StatsGrid({ data }: { data: AgentProfileData }) {
  const top = data.top_models[0]?.model ?? "—";
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pb-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Receipts" value={data.total_calls.toLocaleString()} />
        <Stat
          label="USDC spent"
          value={`$${formatUsdc(data.total_spent_usdc)}`}
        />
        <Stat
          label="Verification"
          value={`${Math.round(data.verification_rate * 100)}%`}
          note="vacuously 100% in v0"
        />
        <Stat
          label="Top model"
          value={shortModel(top)}
          mono
          fullTitle={top}
        />
        <Stat
          label="Last call"
          value={formatRelative(data.last_call_at)}
        />
      </div>
      {data.top_models.length > 1 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="uppercase tracking-[0.18em]">Also used</span>
          {data.top_models.slice(1).map((m) => (
            <span
              key={m.model}
              className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[11px] text-text"
              title={m.model}
            >
              {shortModel(m.model)} · {m.count}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

function ClassificationStats({
  data,
  classification,
}: {
  data: AgentProfileData;
  classification: AgentClassification;
}) {
  if (classification === "undefined") return null;
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pb-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
              {classificationLabel(classification)} metrics
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Per-use-case stats — wired from supervisor classification in
              a follow-up.
            </p>
          </div>
          <ComingSoonBadge />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {classificationFields(classification).map((f) => (
            <Stat key={f} label={f} value="—" />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-text-muted">
          {data.total_calls.toLocaleString()} signed inferences observed.
        </p>
      </Card>
    </section>
  );
}

function RecentReceipts({
  receipts,
  total,
}: {
  receipts: AgentReceipt[];
  total: number;
}) {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
          Recent receipts
        </h2>
        <span className="text-xs text-text-muted">
          Latest {receipts.length} of {total.toLocaleString()}
        </span>
      </div>
      {receipts.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">
            No signed inferences yet for this agent.
          </p>
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
          {receipts.map((r) => (
            <li
              key={r.id}
              className="border-b border-soft/60 last:border-b-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://vdmnexus.com/r/${r.id}`}
                      className="font-mono text-xs text-text underline-offset-4 transition-colors hover:text-accent-indigo hover:underline"
                    >
                      {r.id.slice(0, 12)}…
                    </a>
                    {r.network ? <NetworkBadge network={r.network} /> : null}
                    {r.has_tx ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                        on-chain
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mt-1 truncate font-mono text-[11px] text-text-muted"
                    title={r.model ?? undefined}
                  >
                    {r.model ?? "—"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
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
                  <a
                    href={`https://verify.vdmnexus.com/?receipt=${r.id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-md border border-soft bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
                  >
                    Verify →
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReputationCard({ data }: { data: AgentProfileData }) {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pb-12">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
            Reputation
          </h3>
          <ComingSoonBadge />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-soft bg-bg/40 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Bond status
            </div>
            <div className="mt-1 text-sm text-text">Unbonded</div>
            <p className="mt-1 text-xs text-text-muted">
              Wire 3 ships Day 60 post-launch — agents can bond $NEXUS to
              signal skin-in-the-game and earn a verified badge here.
            </p>
          </div>
          <div className="rounded-xl border border-soft bg-bg/40 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              $NEXUS burned (attributable)
            </div>
            <div className="mt-1 text-sm text-text">—</div>
            <p className="mt-1 text-xs text-text-muted">
              Wire 1 Phase B ships at launch — a share of every inference
              fee gets burned, and the burn is attributed back to the
              agent that paid for the call. Based on{" "}
              <span className="tabular-nums">
                ${formatUsdc(data.total_spent_usdc)}
              </span>{" "}
              spent so far.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

function PublicCTA() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pb-24">
      <div className="rounded-2xl border border-accent-indigo/40 bg-accent-indigo/5 px-6 py-8 backdrop-blur">
        <h3 className="text-lg font-semibold tracking-tight text-text">
          Where to go next.
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Browse other agents on the rail, verify any receipt this agent
          issued, or spin up your own — same Ed25519 + USDC + signed-
          receipt loop.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="https://vdmnexus.com/agents"
            className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-3.5 py-1.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            Browse other agents →
          </a>
          <a
            href="https://verify.vdmnexus.com"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
          >
            Verify a receipt
          </a>
          <a
            href="https://vdmnexus.com/playground"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
          >
            Spin up your own
          </a>
        </div>
      </div>
    </section>
  );
}

function DashboardOnly() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pb-24">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
              Deposit + balance history
            </h3>
            <ComingSoonBadge />
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Full deltas from{" "}
            <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
              credits_ledger
            </code>{" "}
            — deposits with on-chain links, every debit. Lands with
            v1 dashboard.
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
              Manage agent
            </h3>
            <ComingSoonBadge />
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Rename label, set classification, rotate session, toggle public
            visibility per section, view full receipts feed with prompt
            content where opt-in published. Coming in v1.
          </p>
        </Card>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  mono,
  fullTitle,
}: {
  label: string;
  value: string;
  note?: string;
  mono?: boolean;
  fullTitle?: string;
}) {
  return (
    <div className="rounded-xl border border-soft bg-surface/60 px-4 py-3 backdrop-blur">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div
        className={
          "mt-1 text-xl font-semibold tabular-nums text-text sm:text-2xl " +
          (mono ? "font-mono" : "")
        }
        title={fullTitle}
      >
        {value}
      </div>
      {note ? (
        <div className="mt-1 text-[10px] text-text-muted">{note}</div>
      ) : null}
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

function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 12) return pubkey;
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`;
}

function shortModel(model: string): string {
  if (!model) return "—";
  if (model.length <= 18) return model;
  const slash = model.indexOf("/");
  return slash > 0 ? model.slice(slash + 1) : model;
}

function classificationLabel(c: AgentClassification): string {
  switch (c) {
    case "trading":
      return "Trading";
    case "prediction-market":
      return "Prediction market";
    case "research":
      return "Research";
    case "content":
      return "Content";
    case "ops":
      return "Ops";
    default:
      return "Agent";
  }
}

function classificationFields(c: AgentClassification): string[] {
  switch (c) {
    case "trading":
      return ["PnL (USD)", "Win rate", "Avg hold"];
    case "prediction-market":
      return ["Brier score", "Accuracy", "Markets"];
    case "research":
      return ["Pages indexed", "Citations", "Cost / page"];
    case "content":
      return ["Posts drafted", "Approval rate", "Cost / draft"];
    case "ops":
      return ["Runs", "Success rate", "MTTR"];
    default:
      return [];
  }
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

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toISOString().slice(0, 10);
}
