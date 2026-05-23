"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Checks = {
  prompt_hash_ok: boolean;
  response_hash_ok: boolean;
  nexus_signature_ok: boolean;
  payment_on_chain_ok: boolean;
  payer_matches: boolean;
};

type VerifyResult = { ok: boolean; checks: Checks };

const CHECK_LABELS: {
  key: keyof Checks;
  label: string;
  note: string;
  detail: string;
  failHint: string;
}[] = [
  {
    key: "prompt_hash_ok",
    label: "Prompt hash matches",
    note: "sha256 of the prompt equals receipt.prompt_hash",
    detail:
      "The verifier hashes the original prompt bytes and compares to the digest stored in the receipt. If they differ, either the prompt was tampered with after the call or the operator hashed something different from what you sent.",
    failHint:
      "The prompt the operator hashed doesn't match what was supplied to the verifier. Either the prompt has been edited, or the operator hashed different bytes than they returned text for.",
  },
  {
    key: "response_hash_ok",
    label: "Response hash matches",
    note: "sha256 of the response equals receipt.response_hash",
    detail:
      "The verifier hashes the response text and compares to receipt.response_hash. A mismatch means the response text was edited after the receipt was signed.",
    failHint:
      "The response text supplied to the verifier doesn't hash to the digest in the receipt. Whoever produced this receipt didn't sign over the response you're showing.",
  },
  {
    key: "nexus_signature_ok",
    label: "Operator signature valid",
    note: "Ed25519 signature verified against the published operator pubkey",
    detail:
      "The verifier canonicalizes the receipt (sorted keys, no whitespace, excluding nexus_signature) and checks the Ed25519 signature against the operator pubkey published at /api/v1/operator-key.",
    failHint:
      "The signature in the receipt doesn't verify against the operator's published public key. Either the receipt was edited or it wasn't signed by Nexus.",
  },
  {
    key: "payment_on_chain_ok",
    label: "Payment landed on-chain",
    note: "USDC transfer to the declared recipient confirmed on the chain",
    detail:
      "For paid (x402) receipts, the verifier fetches the transaction referenced in receipt.payment.tx_signature and confirms a USDC transfer of the declared amount landed at receipt.payment.pay_to. For prepaid receipts there is no on-chain payment to check and this is vacuously true.",
    failHint:
      "The transaction the receipt references either doesn't exist or didn't transfer USDC to the declared recipient. The payment claim is wrong.",
  },
  {
    key: "payer_matches",
    label: "Payer matches agent",
    note: "First signer of the payment tx equals receipt.agent_pubkey",
    detail:
      "The agent_pubkey in the receipt must be the same key that signed the on-chain payment. This stops someone from re-using another agent's payment to claim a different identity.",
    failHint:
      "The on-chain payment was signed by a different key than the agent_pubkey in the receipt. Identity and payment don't agree.",
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
  const [expanded, setExpanded] = useState<keyof Checks | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setExpanded(null);

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
            Re-runs every check client-side. Click any row to see how that
            check works.
          </p>
        </div>
        <OverallBadge state={state} />
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-soft/60 overflow-hidden rounded-lg border border-soft bg-bg/60">
        {CHECK_LABELS.map(({ key, label, note, detail, failHint }, i) => {
          const status =
            state.status === "loading"
              ? "loading"
              : state.status === "error"
                ? "error"
                : state.result.checks[key]
                  ? "ok"
                  : "fail";
          const isOpen = expanded === key;
          const explanation =
            status === "fail" || status === "error" ? failHint : detail;
          return (
            <li key={key} className="bg-transparent">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg/40"
              >
                <CheckIndicator status={status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">
                    <span className="mr-2 inline-block w-4 font-mono text-[11px] text-text-muted">
                      {i + 1}
                    </span>
                    {label}
                  </p>
                  <p className="ml-6 mt-0.5 text-[11px] leading-relaxed text-text-muted">
                    {note}
                  </p>
                </div>
                <CheckStateBadge status={status} />
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <div className="border-t border-soft/60 bg-bg/40 px-3 py-3 pl-12">
                  <p className="text-[12px] leading-relaxed text-text-muted">
                    {explanation}
                  </p>
                </div>
              )}
            </li>
          );
        })}
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
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
        status === "ok" && "border-emerald-500/50 bg-emerald-500/15",
        status === "fail" && "border-red-500/50 bg-red-500/15",
        status === "error" && "border-red-500/50 bg-red-500/15",
        status === "loading" && "border-soft bg-bg/60"
      )}
      aria-hidden
    >
      {status === "ok" && <Check className="h-3 w-3 text-emerald-300" />}
      {(status === "fail" || status === "error") && (
        <X className="h-3 w-3 text-red-300" />
      )}
      {status === "loading" && (
        <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
      )}
    </span>
  );
}

function CheckStateBadge({
  status,
}: {
  status: "loading" | "ok" | "fail" | "error";
}) {
  if (status === "loading") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
        Checking
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">
        Pass
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-red-300">
      Fail
    </span>
  );
}
