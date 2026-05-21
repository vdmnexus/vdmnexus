"use client";

import { useEffect, useState } from "react";

type VerifyState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "ok";
      checks?: Record<string, boolean>;
      summary?: string;
      mode?: "signature_only" | "full";
    }
  | {
      status: "fail";
      checks?: Record<string, boolean>;
      error?: string;
      mode?: "signature_only" | "full";
    };

export function VerifyWidget({ receiptId }: { receiptId: string }) {
  const [state, setState] = useState<VerifyState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setState({ status: "running" });
      try {
        const res = await fetch("/api/playground/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: receiptId }),
        });
        if (cancelled) return;

        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          checks?: Record<string, boolean>;
          summary?: string;
          error?: string;
          mode?: "signature_only" | "full";
        };

        if (res.ok && body.ok) {
          setState({
            status: "ok",
            checks: body.checks,
            summary: body.summary,
            mode: body.mode,
          });
        } else {
          setState({
            status: "fail",
            checks: body.checks,
            error: body.error ?? `verify_failed_${res.status}`,
            mode: body.mode,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "fail",
          error: err instanceof Error ? err.message : "network_error",
        });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  return (
    <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
            Verification
          </div>
          <p className="mt-2 text-sm text-text-muted">
            {(state.status === "ok" || state.status === "fail") &&
            state.mode === "signature_only"
              ? "Verifies the operator's Ed25519 signature on this receipt. The prompt + response text aren't stored here — replay them through @vdm-nexus/x402's verifyReceipt() for the full 5-check verification."
              : "Independently checks the prompt & response hashes and the operator's Ed25519 signature on this receipt."}
          </p>
        </div>
        <StatusBadge state={state} />
      </div>

      {state.status === "ok" || state.status === "fail" ? (
        <ChecksGrid checks={state.checks} />
      ) : null}

      {state.status === "fail" && state.error ? (
        <p className="mt-4 font-mono text-xs text-rose-300">
          error: {state.error}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ state }: { state: VerifyState }) {
  if (state.status === "running" || state.status === "idle") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/60 px-3 py-1.5 text-xs font-medium text-text-muted">
        <span className="h-2 w-2 animate-soft-pulse rounded-full bg-accent-indigo motion-reduce:animate-none" />
        Verifying…
      </span>
    );
  }
  if (state.status === "ok") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300">
      <span className="h-2 w-2 rounded-full bg-rose-400" />
      Failed
    </span>
  );
}

function ChecksGrid({ checks }: { checks?: Record<string, boolean> }) {
  const entries = Object.entries(checks ?? {});
  if (entries.length === 0) return null;
  return (
    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
      {entries.map(([name, ok]) => (
        <li
          key={name}
          className="flex items-center justify-between gap-3 rounded-md border border-soft bg-bg/40 px-3 py-2 font-mono text-xs"
        >
          <span className="text-text-muted">{name}</span>
          <span
            className={
              ok
                ? "text-emerald-300"
                : "text-rose-300"
            }
          >
            {ok ? "ok" : "fail"}
          </span>
        </li>
      ))}
    </ul>
  );
}
