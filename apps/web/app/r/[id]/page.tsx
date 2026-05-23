import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getServiceClient } from "@/lib/server-supabase";
import { VerifyWidget } from "./verify-widget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReceiptRow = {
  id: string;
  /** Source: "playground" rows carry prompt+response text (the user opted
   * into making them public). "inference" rows are hash-only — the receipt
   * lives on the row but the prompt body never leaves the agent. */
  source: "playground" | "inference";
  prompt: string | null;
  response: string | null;
  receipt: Record<string, unknown> | null;
  tx_signature: string | null;
  created_at: string;
};

// Solana tx signatures are base58-encoded 64-byte blobs → 86-88 chars.
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;
// inference_logs.id is a uuid v4 (8-4-4-4-12 hex with dashes).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadReceipt(id: string): Promise<ReceiptRow | null> {
  const supabase = getServiceClient();

  // 1. Playground short-id (10-char base58) is the most common path — try it
  //    first regardless of input shape so the existing /r/<short> URLs keep
  //    resolving with no extra lookup latency for the hot case.
  const playgroundRes = await supabase
    .from("playground_receipts")
    .select("id, prompt, response, receipt, created_at")
    .eq("id", id)
    .maybeSingle();
  if (playgroundRes.data) {
    const row = playgroundRes.data;
    return {
      id: String(row.id),
      source: "playground",
      prompt: row.prompt as string,
      response: row.response as string,
      receipt: row.receipt as Record<string, unknown> | null,
      tx_signature: null,
      created_at: row.created_at as string,
    };
  }

  // 2. UUID inference_id → inference_logs.id. The signed receipt JSON
  //    is persisted on the row by both /v1/inference and
  //    /v1/chat/completions, so we don't re-sign on read.
  if (UUID_REGEX.test(id)) {
    const { data } = await supabase
      .from("inference_logs")
      .select("id, receipt_json, tx_signature, created_at")
      .eq("id", id.toLowerCase())
      .eq("status", "success")
      .maybeSingle();
    if (data) {
      return {
        id: String(data.id),
        source: "inference",
        prompt: null,
        response: null,
        receipt: data.receipt_json as Record<string, unknown> | null,
        tx_signature: (data.tx_signature as string | null) ?? null,
        created_at: data.created_at as string,
      };
    }
  }

  // 3. Solana tx_signature → inference_logs.tx_signature.
  if (TX_SIGNATURE_REGEX.test(id)) {
    const { data } = await supabase
      .from("inference_logs")
      .select("id, receipt_json, tx_signature, created_at")
      .eq("tx_signature", id)
      .eq("status", "success")
      .maybeSingle();
    if (data) {
      return {
        id: String(data.id),
        source: "inference",
        prompt: null,
        response: null,
        receipt: data.receipt_json as Record<string, unknown> | null,
        tx_signature: (data.tx_signature as string | null) ?? null,
        created_at: data.created_at as string,
      };
    }
  }

  return null;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function truncateMiddle(s: string, head = 6, tail = 6): string {
  if (!s) return "";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await loadReceipt(id);
  if (!row) {
    return {
      title: "Receipt not found — VDM Nexus",
      robots: { index: false },
    };
  }

  const title = `Signed inference receipt — ${truncateMiddle(row.id, 6, 4)}`;
  const description = row.prompt
    ? truncate(row.prompt, 160)
    : "A cryptographically signed inference receipt — model, cost, on-chain payment, and operator signature. Independently verifiable.";
  const url = `https://vdmnexus.com/r/${row.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "VDM Nexus",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      site: "@vdmnexus",
      creator: "@vdmnexus",
      title,
      description,
    },
  };
}

export default async function ReceiptPermalinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await loadReceipt(id);

  if (!row) {
    return <ReceiptNotFound id={id} />;
  }

  const receipt = (row.receipt ?? {}) as Record<string, unknown>;
  const agentPubkey = String(receipt.agent_pubkey ?? "");
  const provider = receipt.provider != null ? String(receipt.provider) : null;
  const model = receipt.model != null ? String(receipt.model) : null;
  const costUsdc = receipt.cost_usdc;
  const timestamp =
    typeof receipt.timestamp === "number"
      ? new Date(receipt.timestamp).toISOString()
      : row.created_at;

  // Derive the network badge from the receipt itself rather than hardcoding.
  // x402 receipts carry `payment.network` (CAIP-2). Prepaid receipts don't —
  // those are devnet-only today, so fall back to "devnet".
  const payment = receipt.payment as { network?: unknown } | undefined;
  const paymentNetwork =
    payment && typeof payment.network === "string" ? payment.network : null;
  const networkBadge = (() => {
    if (!paymentNetwork) return "devnet";
    const n = paymentNetwork.toLowerCase();
    if (n.includes("devnet") || n.includes("etwtrabz")) return "devnet";
    if (n.startsWith("solana:")) return "mainnet";
    if (n === "eip155:84532") return "base sepolia";
    if (n === "eip155:8453") return "base";
    return paymentNetwork;
  })();
  const isMainnetBadge = networkBadge === "mainnet" || networkBadge === "base";

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-4xl px-6 pt-12 pb-8 sm:pt-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-text">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo" />
              Signed inference receipt
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                isMainnetBadge
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {networkBadge}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-xs text-text-muted sm:items-end">
            {agentPubkey ? (
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-[0.16em]">Agent</span>
                <code
                  className="font-mono text-text"
                  title={agentPubkey}
                >
                  {truncateMiddle(agentPubkey, 6, 6)}
                </code>
              </div>
            ) : null}
            <time
              dateTime={timestamp}
              className="font-mono text-text-muted"
              suppressHydrationWarning
            >
              {new Date(timestamp).toUTCString()}
            </time>
          </div>
        </div>

        <h1 className="sr-only">Signed inference receipt {row.id}</h1>
      </section>

      {row.response ? (
        <section className="relative mx-auto w-full max-w-4xl px-6 pb-6">
          <figure className="relative overflow-hidden rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-radial-fade opacity-50"
            />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                <span>Response</span>
                {provider ? (
                  <>
                    <span className="text-text-muted/40">·</span>
                    <span className="text-text">{provider}</span>
                  </>
                ) : null}
                {model ? (
                  <>
                    <span className="text-text-muted/40">·</span>
                    <code className="font-mono text-text">{model}</code>
                  </>
                ) : null}
              </div>
              <blockquote className="border-l-2 border-accent-indigo/60 pl-5 text-balance text-lg leading-relaxed text-text sm:text-xl">
                {row.response}
              </blockquote>
              {typeof costUsdc === "number" ? (
                <figcaption className="mt-5 font-mono text-xs text-text-muted">
                  cost {costUsdc.toFixed ? costUsdc.toFixed(6) : String(costUsdc)} USDC
                </figcaption>
              ) : null}
            </div>
          </figure>
        </section>
      ) : (
        <section className="relative mx-auto w-full max-w-4xl px-6 pb-6">
          <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur sm:p-8">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              <span>Receipt</span>
              {model ? (
                <>
                  <span className="text-text-muted/40">·</span>
                  <code className="font-mono text-text">{model}</code>
                </>
              ) : null}
              <span className="text-text-muted/40">·</span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200">
                hashes only
              </span>
            </div>
            <p className="text-sm text-text-muted">
              The prompt and response for this receipt were never sent to
              Nexus — only their <code className="font-mono text-text">sha256</code>{" "}
              hashes are on the signed payload. To verify, the agent that
              made the call can replay the prompt &amp; response through{" "}
              <code className="font-mono text-text">verifyReceipt()</code>{" "}
              in <code className="font-mono text-text">@vdm-nexus/x402</code>.
            </p>
            {typeof costUsdc === "number" ? (
              <div className="mt-5 font-mono text-xs text-text-muted">
                cost {costUsdc.toFixed ? costUsdc.toFixed(6) : String(costUsdc)} USDC
              </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="relative mx-auto w-full max-w-4xl px-6 pb-6">
        <div className={`grid gap-4 ${row.prompt ? "md:grid-cols-2" : ""}`}>
          {row.prompt ? (
            <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
              <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                Prompt
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-text">
                {row.prompt}
              </pre>
            </div>
          ) : null}

          <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              Signed receipt
            </div>
            <pre className="max-h-[420px] overflow-auto font-mono text-[12px] leading-relaxed text-text">
              {JSON.stringify(receipt, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-4xl px-6 pb-12">
        <VerifyWidget receiptId={row.id} />
      </section>

      <section className="relative mx-auto w-full max-w-4xl px-6 pb-16">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            The widget above runs in-browser. For a fully independent check
            from a separate domain, verify this receipt on{" "}
            <code className="font-mono text-text">verify.vdmnexus.com</code> —
            or run your own signed inference in the playground.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://verify.vdmnexus.com/?r=${encodeURIComponent(row.id)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-soft bg-bg/60 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
            >
              Verify independently
            </a>
            <Link
              href="/playground"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
            >
              Open the playground
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ReceiptNotFound({ id }: { id: string }) {
  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />
      <section className="relative mx-auto w-full max-w-2xl px-6 py-24 text-center sm:py-32">
        <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
          404 · receipt not found
        </span>
        <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          That receipt doesn&apos;t exist.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-text-muted">
          The id <code className="font-mono text-text">{truncateMiddle(id, 6, 6)}</code>{" "}
          didn&apos;t match any signed inference on this rail. It may have been
          deleted, or never minted.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/playground"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-3 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            Run your own signed inference
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
          >
            Back to vdmnexus.com
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
