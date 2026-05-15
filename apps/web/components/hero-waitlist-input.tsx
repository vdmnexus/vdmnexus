"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useWaitlist } from "./waitlist-context";

export function HeroWaitlistInput() {
  const ctx = useWaitlist();
  const [email, setEmail] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (trimmed) ctx?.setPrefilledEmail(trimmed);
    const target = document.getElementById("waitlist");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="group mx-auto flex w-full max-w-md items-center gap-1.5 rounded-lg border border-soft bg-surface/70 p-1.5 backdrop-blur transition-colors focus-within:border-accent-indigo/60"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        aria-label="Email"
        className="flex-1 bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-muted/60 outline-none"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-3.5 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
      >
        Join Waitlist
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
