"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Checks = {
  prompt_hash_ok: boolean;
  response_hash_ok: boolean;
  nexus_signature_ok: boolean;
  payment_on_chain_ok: boolean;
  payer_matches: boolean;
};

type VerifyResult = { ok: boolean; checks: Checks };

const CHECK_LABELS: { key: keyof Checks; label: string; note: string }[] = [
  {
    key: "prompt_hash_ok",
    label: "Prompt hash matches",
    note: "sha256 of the prompt equals receipt.prompt_hash",
  },
  {
    key: "response_hash_ok",
    label: "Response hash matches",
    note: "sha256 of the response equals receipt.response_hash",
  },
  {
    key: "nexus_signature_ok",
    label: "Operator signature valid",
    note: "Ed25519 signature verified against the published operator pubkey",
  },
  {
    key: "payment_on_chain_ok",
    label: "Payment landed on-chain",
    note: "USDC transfer to the declared recipient confirmed on Solana",
  },
  {
    key: "payer_matches",
    label: "Payer matches agent",
    note: "First signer of the payment tx equals receipt.agent_pubkey",
  },
];

export function VerifyWidget({
  receipt,
  prompt,
  response,
}: {
  receipt: Record<string, unknown>;
  prompt: string;
  response: string;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ok"; result: VerifyResult }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch("/api/playground/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt, prompt, response }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Verify failed (${res.status})`);
        return (await res.json()) as VerifyResult;
      })
      .then((result) => {
        if (!cancelled) setState({ status: "ok", result });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Verify failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [receipt, prompt, response]);

  return (
    <div className="rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Verification
          </span>
          <p className="mt-1 text-sm text-text-muted">
            Re-runs every check client-side. Nothing trusted.
          </p>
        </div>
        <OverallBadge state={state} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {CHECK_LABELS.map(({ key, label, note }) => (
          <li
            key={key}
            className="flex items-start gap-2.5 rounded-lg border border-soft bg-bg/60 p-3"
          >
            <CheckIndicator
              status={
                state.status === "loading"
                  ? "loading"
                  : state.status === "error"
                    ? "error"
                    : state.result.checks[key]
                      ? "ok"
                      : "fail"
              }
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-text">{label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {note}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {state.status === "error" && (
        <p className="mt-3 text-xs text-red-400">{state.message}</p>
      )}
    </div>
  );
}

function OverallBadge({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "ok"; result: VerifyResult }
    | { status: "error"; message: string };
}) {
  if (state.status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-soft bg-bg/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-red-300">
        <X className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return state.result.ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-300">
      <Check className="h-3 w-3" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-red-300">
      <X className="h-3 w-3" />
      Mismatch
    </span>
  );
}

function CheckIndicator({
  status,
}: {
  status: "loading" | "ok" | "fail" | "error";
}) {
  return (
    <span
      className={cn(
        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
        status === "ok" && "border-emerald-500/50 bg-emerald-500/15",
        status === "fail" && "border-red-500/50 bg-red-500/15",
        status === "error" && "border-red-500/50 bg-red-500/15",
        status === "loading" && "border-soft bg-bg/60"
      )}
      aria-hidden
    >
      {status === "ok" && <Check className="h-2.5 w-2.5 text-emerald-300" />}
      {(status === "fail" || status === "error") && (
        <X className="h-2.5 w-2.5 text-red-300" />
      )}
      {status === "loading" && (
        <Loader2 className="h-2.5 w-2.5 animate-spin text-text-muted" />
      )}
    </span>
  );
}
