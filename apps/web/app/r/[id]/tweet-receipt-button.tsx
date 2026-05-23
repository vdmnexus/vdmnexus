"use client";

/**
 * "Tweet this receipt" — receipt-as-social-object button. Auto-builds a
 * headline from model + cost + network and opens an X intent. Makes each
 * /r/<id> permalink a one-click distribution surface.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type TweetReceiptButtonProps = {
  receiptId: string;
  model: string | null;
  costUsdc: number | null;
  network: string | null;
  agentPubkey: string | null;
};

function truncateAgent(pubkey: string): string {
  if (pubkey.length <= 8) return pubkey;
  return `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`;
}

function networkLabel(n: string | null): string {
  if (!n) return "devnet";
  const lower = n.toLowerCase();
  if (lower.includes("devnet") || lower.includes("etwtrabz")) return "devnet";
  if (lower.startsWith("solana:")) return "Solana mainnet";
  if (lower === "eip155:84532") return "Base sepolia";
  if (lower === "eip155:8453") return "Base";
  return n;
}

function buildHeadline(p: TweetReceiptButtonProps): string {
  const agent = p.agentPubkey ? truncateAgent(p.agentPubkey) : "an agent";
  const model = p.model ?? "an LLM";
  const cost = p.costUsdc != null ? `$${p.costUsdc.toFixed(6)}` : "USDC";
  const net = networkLabel(p.network);
  return `Agent ${agent} paid ${cost} for a verified ${model} call on ${net} — every byte signed by @vdmnexus.\n\nVerify the receipt:`;
}

export function TweetReceiptButton(props: TweetReceiptButtonProps) {
  const [copied, setCopied] = useState(false);
  const url = `https://vdmnexus.com/r/${props.receiptId}`;
  const tweetText = buildHeadline(props);
  const tweetHref = `https://x.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(url)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy link:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={tweetHref}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
      >
        <XIcon className="h-3 w-3" />
        Tweet this receipt
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60"
        aria-label="Copy receipt link"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-300" />
            Link copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </>
        )}
      </button>
    </div>
  );
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
