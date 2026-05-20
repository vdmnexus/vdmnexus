"use client";

import { useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";

const TWEET_TEXT =
  "Just ran a signed inference on @vdmnexus — every call is signed by the operator key + paid via x402. Verify it yourself:";

export function ShareButton({
  permalink,
  taskType,
}: {
  permalink: string;
  taskType?: string;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined" && permalink.startsWith("/")
      ? `${window.location.origin}${permalink}`
      : permalink;

  const tweetText =
    taskType && taskType !== "general"
      ? `${TWEET_TEXT} (${taskType} mode)`
      : TWEET_TEXT;

  const tweetHref = `https://x.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(url)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60"
        aria-label="Copy permalink"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-300" />
            Copied
          </>
        ) : (
          <>
            <LinkIcon className="h-3.5 w-3.5" />
            Copy permalink
          </>
        )}
      </button>
      <a
        href={tweetHref}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
      >
        <XIcon className="h-3 w-3" />
        Tweet this
      </a>
      {copied && (
        <span className="font-mono text-[11px] text-text-muted">
          {truncate(url, 48)}
        </span>
      )}
    </div>
  );
}

function truncate(url: string, n: number) {
  return url.length <= n ? url : `${url.slice(0, n - 1)}…`;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.671l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
