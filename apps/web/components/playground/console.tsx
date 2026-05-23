"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
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

const PROMPT_EXAMPLES: { label: string; prompt: string; taskType: TaskType }[] = [
  {
    label: "Explain x402",
    prompt:
      "Explain the x402 protocol in one paragraph as if I'm a backend engineer who knows HTTP but hasn't touched crypto.",
    taskType: "general",
  },
  {
    label: "Summarize a Solana tx",
    prompt:
      "Summarize what likely happened in a Solana transaction that contains exactly one SPL-Token transfer instruction of the USDC mint, signed by a single account, with no compute-budget instructions.",
    taskType: "general",
  },
  {
    label: "Write a unit test",
    prompt:
      "Write a Jest test in TypeScript that verifies SHA-256(\"hello\") equals \"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824\".",
    taskType: "fast",
  },
  {
    label: "Reason about a trade-off",
    prompt:
      "An autonomous AI agent needs to pay for tools per call. List the three biggest trade-offs between settling each payment on-chain versus running a pre-paid balance ledger off-chain.",
    taskType: "reasoning",
  },
];

// Step strip — surfaces what's happening server-side during the call. Each
// step's "expected" duration is approximate; we tick forward on a timer so
// users get a sense of progress even though we don't stream real events.
const STEPS = [
  { key: "sign", label: "Signing request", durationMs: 250 },
  { key: "verify", label: "Verifying agent", durationMs: 350 },
  { key: "infer", label: "Calling the model", durationMs: 2200 },
  { key: "receipt", label: "Signing the receipt", durationMs: 400 },
] as const;

export function PlaygroundConsole() {
  const [prompt, setPrompt] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("general");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [permalink, setPermalink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearStepTimers() {
    for (const t of stepTimers.current) clearTimeout(t);
    stepTimers.current = [];
  }

  // Cleanup on unmount.
  useEffect(() => clearStepTimers, []);

  function startStepProgression() {
    clearStepTimers();
    setActiveStep(0);
    let elapsed = 0;
    // Move to step 1, 2, 3 at the cumulative timing. The last step ("receipt")
    // stays pending until the request resolves — then we mark it done.
    for (let i = 0; i < STEPS.length - 1; i++) {
      elapsed += STEPS[i].durationMs;
      const idx = i + 1;
      const timer = setTimeout(() => setActiveStep(idx), elapsed);
      stepTimers.current.push(timer);
    }
  }

  async function handleRun() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setReceipt(null);
    setPermalink(null);
    startStepProgression();

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
      clearStepTimers();
      setActiveStep(STEPS.length);
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  }

  function applyExample(p: (typeof PROMPT_EXAMPLES)[number]) {
    if (loading) return;
    setPrompt(p.prompt);
    setTaskType(p.taskType);
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

            <PromptChips onPick={applyExample} disabled={loading} />

            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (rate limited per IP). Every call returns a signed receipt you can verify."
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
                  <StepStrip activeStep={activeStep} />
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
          <PostCallActions
            receipt={receipt}
            permalink={permalink}
            taskType={taskType}
          />
        </FadeIn>
      )}
    </FadeIn>
  );
}

function PromptChips({
  onPick,
  disabled,
}: {
  onPick: (p: (typeof PROMPT_EXAMPLES)[number]) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Example prompts">
      {PROMPT_EXAMPLES.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPick(p)}
          disabled={disabled}
          className="rounded-full border border-soft bg-bg/40 px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:bg-accent-indigo/10 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function StepStrip({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex flex-col gap-2">
      {STEPS.map((step, i) => {
        const state =
          i < activeStep ? "done" : i === activeStep ? "active" : "pending";
        return (
          <div
            key={step.key}
            className="flex items-center gap-2.5 text-[13px]"
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                state === "done" &&
                  "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
                state === "active" &&
                  "border-accent-indigo/60 bg-accent-indigo/15 text-accent-indigo",
                state === "pending" && "border-soft bg-bg/60 text-text-muted/50"
              )}
              aria-hidden
            >
              {state === "done" && <Check className="h-2.5 w-2.5" />}
              {state === "active" && (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              )}
            </span>
            <span
              className={cn(
                state === "done" && "text-text",
                state === "active" && "text-text",
                state === "pending" && "text-text-muted/60"
              )}
            >
              {step.label}
              {state === "active" && "…"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PostCallActions({
  receipt,
  permalink,
  taskType,
}: {
  receipt: Receipt;
  permalink: string;
  taskType: TaskType;
}) {
  const [copied, setCopied] = useState(false);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked in restrictive contexts (e.g. some browsers
      // when the page isn't focused). Falling back to a prompt keeps the
      // action usable without a hard error UI.
      window.prompt("Copy receipt JSON:", JSON.stringify(receipt, null, 2));
    }
  }

  const id = permalink.replace(/^\/r\//, "");
  const verifyHref = `https://verify.vdmnexus.com/?r=${encodeURIComponent(id)}`;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-soft bg-surface/60 p-4 backdrop-blur sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copyJson}
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60"
          aria-label="Copy receipt JSON"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              Copied JSON
            </>
          ) : (
            <>Copy JSON</>
          )}
        </button>
        <a
          href={verifyHref}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60"
        >
          Verify on verify.vdmnexus.com
        </a>
        <ShareButton permalink={permalink} taskType={taskType} />
      </div>
      <a
        href="https://docs.vdmnexus.com/docs/spec/sir-v2"
        target="_blank"
        rel="noreferrer noopener"
        className="text-sm text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
      >
        How does this work?
      </a>
    </div>
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
