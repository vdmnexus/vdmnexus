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
  prompt: string;
  response: string;
  receipt: Record<string, unknown> | null;
  created_at: string;
};

async function loadReceipt(id: string): Promise<ReceiptRow | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("playground_receipts")
    .select("id, prompt, response, receipt, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ReceiptRow;
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
  const description = truncate(row.prompt, 160);
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
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
              devnet
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

      <section className="relative mx-auto w-full max-w-4xl px-6 pb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              Prompt
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-text">
              {row.prompt}
            </pre>
          </div>

          <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              Receipt
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
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur sm:flex-row sm:items-center">
          <p className="text-sm text-text-muted">
            Run your own signed inference in the playground — no API key, no
            signup.
          </p>
          <Link
            href="/playground"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            Open the playground
          </Link>
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
