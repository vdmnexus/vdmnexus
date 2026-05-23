"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail in restricted contexts (no HTTPS, no
      // user gesture). The visual just snaps back — no toast.
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy ${value}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-soft bg-bg/60 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text",
        className
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-3 w-3"
        aria-hidden
      >
        <rect x="4" y="4" width="9" height="9" rx="1.5" />
        <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" />
      </svg>
      {copied ? "Copied" : label}
    </button>
  );
}
