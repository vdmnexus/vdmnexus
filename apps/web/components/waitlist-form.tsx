"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useWaitlist } from "./waitlist-context";
import { cn } from "@/lib/utils";

const BUILDING_OPTIONS = [
  "AI automation business",
  "On-chain agent",
  "AI SaaS",
  "Other",
];

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const ctx = useWaitlist();
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    const supabase = getSupabase();

    if (!supabase) {
      setErrorMessage(
        "Waitlist is temporarily unavailable. Please try again later."
      );
      setStatus("error");
      return;
    }

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: trimmedEmail, building: building || null });

    if (error) {
      const isDuplicate =
        error.code === "23505" ||
        /duplicate|unique/i.test(error.message ?? "");

      if (isDuplicate) {
        setStatus("success");
        return;
      }

      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-accent-indigo/40 bg-accent-indigo/5 p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-accent-indigo/50 bg-accent-indigo/10">
          <Check className="h-5 w-5 text-text" />
        </div>
        <h3 className="text-xl font-semibold text-text">You&apos;re on the list</h3>
        <p className="mt-2 text-sm text-text-muted">
          We&apos;ll be in touch as we onboard the first cohort.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        {status === "submitting" ? "Submitting..." : "Join the waitlist"}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
