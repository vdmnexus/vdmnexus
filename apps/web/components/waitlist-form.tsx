"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useWaitlist } from "./waitlist-context";
import { useWaitlistSubmit } from "@/lib/use-waitlist-submit";
import { cn } from "@/lib/utils";

const BUILDING_OPTIONS = [
  "AI automation business",
  "On-chain agent",
  "AI SaaS",
  "Other",
];

export function WaitlistForm() {
  const ctx = useWaitlist();
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const { status, errorMessage, submit } = useWaitlistSubmit();

  useEffect(() => {
    if (ctx?.prefilledEmail) {
      setEmail(ctx.prefilledEmail);
    }
  }, [ctx?.prefilledEmail]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({
      email,
      building: building || null,
      website: honeypotRef.current?.value ?? "",
    });
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
