"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useWaitlist } from "./waitlist-context";
import { cn } from "@/lib/utils";

const BUILDING_OPTIONS = [
  "AI automation business",
  "On-chain agent",
  "AI SaaS",
  "Other",
];

type Status = "idle" | "submitting" | "success" | "error";

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
};

function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Attribution = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  const ref = document.referrer;
  if (ref) {
    try {
      const parsed = new URL(ref);
      if (parsed.hostname !== window.location.hostname) out.referrer = ref;
    } catch {
      // ignore malformed referrer
    }
  }
  return out;
}

export function WaitlistForm() {
  const ctx = useWaitlist();
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const attributionRef = useRef<Attribution>({});

  useEffect(() => {
    attributionRef.current = captureAttribution();
  }, []);

  useEffect(() => {
    if (ctx?.prefilledEmail) {
      setEmail(ctx.prefilledEmail);
    }
  }, [ctx?.prefilledEmail]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email.");
      setStatus("error");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          building: building || null,
          website: honeypotRef.current?.value ?? "",
          ...attributionRef.current,
        }),
      });

      if (res.ok) {
        setStatus("success");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === "rate_limited") {
        setErrorMessage("Too many attempts. Please try again later.");
      } else if (data.error === "invalid_email") {
        setErrorMessage("Please enter a valid email address.");
      } else if (data.error === "service_unavailable") {
        setErrorMessage("Waitlist is temporarily unavailable. Please try again later.");
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
      setStatus("error");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-accent-indigo/40 bg-accent-indigo/5 p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-accent-indigo/50 bg-accent-indigo/10">
          <Check className="h-5 w-5 text-text" />
        </div>
        <h3 className="text-xl font-semibold text-text">Got it — thanks</h3>
        <p className="mt-2 text-sm text-text-muted">
          We&apos;ll send the occasional build-log digest your way and
          reach out if there&apos;s something specific to share.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="website">Website (leave blank)</label>
        <input
          ref={honeypotRef}
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          className="w-full rounded-md border border-soft bg-surface/60 px-4 py-3 text-sm text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent-indigo/60 focus:bg-surface"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="building"
          className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted"
        >
          What are you building?
        </label>
        <select
          id="building"
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          className="w-full appearance-none rounded-md border border-soft bg-surface/60 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60 focus:bg-surface"
        >
          <option value="">Select an option</option>
          {BUILDING_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          "group inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-3 text-sm font-medium text-text transition-colors",
          "hover:border-accent-indigo hover:bg-accent-indigo/30",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {status === "submitting" ? "Sending..." : "Send"}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
