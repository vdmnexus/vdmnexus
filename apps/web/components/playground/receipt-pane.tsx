"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Receipt = Record<string, unknown> & {
  prompt_hash?: string;
  response_hash?: string;
  nexus_signature?: string;
};

const TOOLTIPS: Record<string, string> = {
  prompt_hash: "sha256 of the exact prompt bytes sent to the model.",
  response_hash:
    "sha256 of the exact response text the model returned.",
  nexus_signature:
    "Ed25519 signature by VDM Nexus's operator key over the canonical JSON of this receipt. The pubkey is published at /api/v1/operator-key.",
};

const HIGHLIGHTED = new Set(Object.keys(TOOLTIPS));

export function ReceiptPane({ receipt }: { receipt: Receipt | null }) {
  return (
    <div className="flex-1 rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Receipt
        </span>
        <div className="flex items-center gap-2">
          {receipt && (
            <span className="font-mono text-[11px] text-text-muted">
              v{String(receipt.v ?? "?")} · signed
            </span>
          )}
          {receipt && <CopyReceiptButton receipt={receipt} />}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-soft bg-bg/60 p-4 font-mono text-[12px] leading-relaxed">
        {receipt ? (
          <ReceiptJson receipt={receipt} />
        ) : (
          <span className="text-text-muted/60">
            The signed receipt will appear here after a successful call.
          </span>
        )}
      </div>
    </div>
  );
}

function CopyReceiptButton({ receipt }: { receipt: Receipt }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = JSON.stringify(receipt, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy receipt JSON:", text);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Receipt JSON copied" : "Copy receipt JSON"}
      className="inline-flex items-center gap-1 rounded border border-soft bg-bg/60 px-1.5 py-0.5 text-[11px] font-mono text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-300" />
          copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          copy
        </>
      )}
    </button>
  );
}

function ReceiptJson({ receipt }: { receipt: Receipt }) {
  return (
    <div className="text-text">
      <span className="text-text-muted">{"{"}</span>
      <div className="pl-4">
        {Object.entries(receipt).map(([key, value], i, arr) => (
          <ReceiptLine
            key={key}
            keyName={key}
            value={value}
            last={i === arr.length - 1}
          />
        ))}
      </div>
      <span className="text-text-muted">{"}"}</span>
    </div>
  );
}

function ReceiptLine({
  keyName,
  value,
  last,
}: {
  keyName: string;
  value: unknown;
  last: boolean;
}) {
  const highlighted = HIGHLIGHTED.has(keyName);
  const tooltip = TOOLTIPS[keyName];

  return (
    <div className="flex flex-wrap items-start gap-x-2">
      <span
        className={cn(
          highlighted ? "text-accent-indigo" : "text-text-muted"
        )}
      >
        {highlighted && tooltip ? (
          <KeyTooltip name={keyName} tooltip={tooltip} />
        ) : (
          `"${keyName}"`
        )}
        <span className="text-text-muted">: </span>
      </span>
      <span className="break-all text-text">
        <RenderValue value={value} />
        {!last && <span className="text-text-muted">,</span>}
      </span>
    </div>
  );
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null) return <span className="text-text-muted">null</span>;
  if (typeof value === "string")
    return <span className="text-text">{`"${value}"`}</span>;
  if (typeof value === "number" || typeof value === "boolean")
    return <span className="text-accent-blue">{String(value)}</span>;
  if (typeof value === "object") {
    return <span className="text-text">{JSON.stringify(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

function KeyTooltip({ name, tooltip }: { name: string; tooltip: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-describedby={`tip-${name}`}
        className="cursor-help underline decoration-dotted decoration-accent-indigo/60 underline-offset-4"
      >
        {`"${name}"`}
      </button>
      {open && (
        <span
          id={`tip-${name}`}
          role="tooltip"
          className="absolute left-0 top-full z-10 mt-1 w-64 max-w-[80vw] rounded-md border border-soft bg-bg/95 p-2.5 text-[11px] font-normal leading-relaxed text-text-muted shadow-lg backdrop-blur"
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
