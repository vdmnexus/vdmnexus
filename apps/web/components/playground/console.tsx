"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/fade-in";
import { ReceiptPane } from "@/components/playground/receipt-pane";
import { VerifyWidget } from "@/components/playground/verify-widget";
import { ShareButton } from "@/components/playground/share-button";

type TaskType = "fast" | "reasoning" | "general";

type Receipt = {
  v: number;
  agent_pubkey: string;
  provider: string;
  model: string;
  cost_usdc: number;
  balance_remaining?: number;
  prompt_hash: string;
  response_hash: string;
  timestamp: number;
  inference_id: string;
  nexus_signature: string;
  payment?: { pay_to?: string; tx_signature?: string };
} & Record<string, unknown>;

type InferenceSuccess = {
  id: string;
  permalink: string;
  result: string;
  receipt: Receipt;
};

type InferenceError =
  | { error: "rate_limited"; retry_after_ms: number }
  | { error: string; message?: string };

const TASK_TYPES: { value: TaskType; label: string; hint: string }[] = [
  { value: "fast", label: "Fast", hint: "Groq Llama 3 70B" },
  { value: "general", label: "General", hint: "GPT-4o mini" },
  { value: "reasoning", label: "Reasoning", hint: "Claude Haiku" },
];

export function PlaygroundConsole() {
  const [prompt, setPrompt] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("general");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [permalink, setPermalink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setReceipt(null);
    setPermalink(null);

    try {
      const res = await fetch("/api/playground/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, task_type: taskType }),
      });

      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as
          | InferenceError
          | null;
        const wait =
          body && "retry_after_ms" in body && body.retry_after_ms
            ? Math.ceil(body.retry_after_ms / 1000)
            : null;
        setError(
          wait
            ? `Rate limited. Try again in ${wait}s.`
            : "Rate limited. Try again in a moment."
        );
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | InferenceError
          | null;
        setError(
          (body && "message" in body && body.message) ||
            (body && "error" in body && body.error) ||
            `Request failed (${res.status})`
        );
        return;
      }

      const data = (await res.json()) as InferenceSuccess;
      setResult(data.result);
      setReceipt(data.receipt);
      setPermalink(data.permalink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  }

  return (
    <FadeIn>
      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <div className="lg:col-span-2">
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur sm:p-6">
            <div className="flex items-center justify-between">
              <label
                htmlFor="prompt"
                className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted"
              >
                Prompt
              </label>
              <TaskTypePicker value={taskType} onChange={setTaskType} />
            </div>

            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything. Every call returns a signed receipt."
              rows={8}
              className="w-full flex-1 resize-none rounded-lg border border-soft bg-bg/60 px-3 py-3 font-mono text-sm leading-relaxed text-text placeholder:text-text-muted/60 focus:border-accent-indigo/60 focus:outline-none focus:ring-1 focus:ring-accent-indigo/40"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-text-muted">
                ⌘+Enter to run
              </span>
              <button
                type="button"
                onClick={handleRun}
                disabled={loading || !prompt.trim()}
                className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-accent-indigo/60 disabled:hover:bg-accent-indigo/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    Run
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex h-full flex-col gap-4">
            <div className="rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                  Response
                </span>
                {receipt && (
                  <span className="font-mono text-[11px] text-text-muted">
                    {receipt.provider} · {receipt.model} · $
                    {receipt.cost_usdc.toFixed(6)}
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "mt-3 min-h-[200px] whitespace-pre-wrap rounded-lg border border-soft bg-bg/60 p-4 font-mono text-sm leading-relaxed",
                  result ? "text-text" : "text-text-muted/60"
                )}
              >
                {error ? (
                  <span className="text-red-400">{error}</span>
                ) : result ? (
                  result
                ) : loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Signing your inference…
                  </span>
                ) : (
                  "Response and signed receipt will appear here."
                )}
              </div>
            </div>

            <ReceiptPane receipt={receipt} />
          </div>
        </div>
      </div>

      {receipt && result && (
        <FadeIn delay={0.05}>
          <div className="mt-6">
            <VerifyWidget
              receipt={receipt}
              prompt={prompt}
              response={result}
            />
          </div>
        </FadeIn>
      )}

      {receipt && permalink && (
        <FadeIn delay={0.1}>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-soft bg-surface/60 p-4 backdrop-blur sm:p-5">
            <ShareButton permalink={permalink} taskType={taskType} />
            <a
              href="https://docs.vdmnexus.com/docs/spec/sir-v2"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
            >
              How does this work?
            </a>
          </div>
        </FadeIn>
      )}
    </FadeIn>
  );
}

function TaskTypePicker({
  value,
  onChange,
}: {
  value: TaskType;
  onChange: (v: TaskType) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Task type"
      className="flex items-center gap-1 rounded-md border border-soft bg-bg/60 p-0.5"
    >
      {TASK_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          title={t.hint}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
            value === t.value
              ? "bg-accent-indigo/20 text-text"
              : "text-text-muted hover:text-text"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
