"use client";

import { useState } from "react";
import type { Broadcast, BroadcastDraft, BroadcastPlatform } from "@/lib/broadcasts";

type Props = { broadcasts: Broadcast[] };

const PLATFORM_ORDER: BroadcastPlatform[] = ["x", "farcaster", "telegram", "linkedin"];

export function BroadcastsView({ broadcasts }: Props) {
  if (broadcasts.length === 0) {
    return (
      <div className="rounded-2xl border border-soft bg-surface p-10 text-center text-sm text-text-muted">
        No broadcast drafts found. Author one in{" "}
        <code className="rounded bg-bg px-1.5 py-0.5 text-text">
          marketing/broadcasts/
        </code>{" "}
        and it&apos;ll show up here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {broadcasts.map((b) => (
        <BroadcastCard key={b.slug} broadcast={b} />
      ))}
    </div>
  );
}

function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  const initial: BroadcastPlatform | null =
    broadcast.drafts.find((d) => PLATFORM_ORDER.includes(d.platform))?.platform ?? null;
  const [active, setActive] = useState<BroadcastPlatform | null>(initial);

  const draft = broadcast.drafts.find((d) => d.platform === active) ?? null;
  const drafted = formatDrafted(broadcast.drafted);

  return (
    <article className="rounded-2xl border border-soft bg-surface p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {broadcast.type && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] ${typeChipClass(
                  broadcast.type,
                )}`}
              >
                {extractTypePrefix(broadcast.type)}
              </span>
            )}
            {broadcast.linkedPrs.map((n) => (
              <a
                key={n}
                href={`https://github.com/vdmnexus/vdmnexus/pull/${n}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-text-muted hover:text-text"
              >
                #{n}
              </a>
            ))}
            {broadcast.status && (
              <span className="text-xs text-text-muted">
                · {broadcast.status}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-text">
            {broadcast.title}
          </h2>
          {drafted && (
            <p className="mt-1 text-xs text-text-muted">{drafted}</p>
          )}
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-b border-soft pb-3">
        {PLATFORM_ORDER.map((p) => {
          const d = broadcast.drafts.find((x) => x.platform === p);
          const enabled = !!d;
          const isActive = active === p;
          return (
            <button
              key={p}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && setActive(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                isActive
                  ? "bg-accent-indigo/15 text-accent-indigo"
                  : enabled
                    ? "text-text-muted hover:bg-bg hover:text-text"
                    : "text-text-muted/40"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              {labelFor(p)}
              {d && (
                <span
                  className={`ml-2 text-[10px] tabular-nums ${
                    d.chars > d.limit ? "text-red-400" : "text-text-muted"
                  }`}
                >
                  {d.chars}/{d.limit}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {draft ? (
          <DraftPanel draft={draft} broadcast={broadcast} />
        ) : (
          <p className="text-sm text-text-muted">No draft authored for this platform.</p>
        )}
      </div>

      {broadcast.visualPath && (
        <div className="mt-5 border-t border-soft pt-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            Visual companion
          </div>
          <code className="mt-2 inline-block rounded bg-bg px-2 py-1 text-xs text-text">
            {broadcast.visualPath}
          </code>
          <p className="mt-2 text-xs text-text-muted">
            Render with{" "}
            <code className="rounded bg-bg px-1 py-0.5 text-text">
              make -C marketing/media {visualTarget(broadcast.visualPath)}
            </code>
            , then attach in the platform composer.
          </p>
        </div>
      )}
    </article>
  );
}

function DraftPanel({
  draft,
  broadcast,
}: {
  draft: BroadcastDraft;
  broadcast: Broadcast;
}) {
  const [copied, setCopied] = useState(false);
  const intent = draft.platform === "x"
    ? `https://x.com/intent/tweet?text=${encodeURIComponent(draft.text)}`
    : null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-soft bg-bg px-4 py-4 text-sm leading-relaxed text-text">
        {draft.text}
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md border border-soft bg-bg px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/40 hover:bg-accent-indigo/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        {intent && (
          <a
            href={intent}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-accent-indigo/40 bg-accent-indigo/15 px-3 py-1.5 text-xs font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/25"
          >
            Open in X composer →
          </a>
        )}
        <span
          className={`ml-auto text-xs tabular-nums ${
            draft.chars > draft.limit ? "text-red-400" : "text-text-muted"
          }`}
        >
          {draft.chars} / {draft.limit} chars
        </span>
      </div>
      <input
        type="text"
        readOnly
        value={`File: marketing/broadcasts/${broadcast.slug}.md`}
        className="mt-3 w-full cursor-text rounded-md border border-soft bg-bg/40 px-3 py-1.5 text-[11px] text-text-muted"
      />
    </div>
  );
}

function labelFor(p: BroadcastPlatform): string {
  return p === "x" ? "X" : p === "farcaster" ? "Farcaster" : p === "telegram" ? "Telegram" : "LinkedIn";
}

function extractTypePrefix(type: string): string {
  // "feat (combined: 0.2.0 ship + 0.2.1 x402 handshake fix)" → "feat"
  const m = type.match(/^(\w+)/);
  return (m ? m[1] : type).toLowerCase();
}

function typeChipClass(type: string): string {
  const t = extractTypePrefix(type);
  if (t === "feat") return "bg-accent-indigo/20 text-accent-indigo";
  if (t === "fix") return "bg-accent-blue/20 text-accent-blue";
  if (t === "docs") return "bg-cyan-500/20 text-cyan-400";
  if (t === "infra") return "bg-green-500/20 text-green-400";
  return "bg-text-muted/20 text-text-muted";
}

function formatDrafted(drafted: string | null): string | null {
  if (!drafted) return null;
  return `Drafted ${drafted}`;
}

function visualTarget(visualPath: string): string {
  const m = visualPath.match(/\/out\/([\w-]+)\./);
  if (!m) return "all";
  return m[1];
}
