"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useWaitlistSubmit } from "@/lib/use-waitlist-submit";
import { cn } from "@/lib/utils";

/**
 * Collaborator sign-up for `/build`. Posts to the same `/api/waitlist`
 * endpoint and the same `public.waitlist` table as the homepage form —
 * same email validation, same per-IP-hash rate limit, same honeypot, same
 * confirmation email. No new infrastructure.
 *
 * Sibling component rather than props on `WaitlistForm`: that form's second
 * field is a fixed four-option `<select>`, this one is free text, and the
 * two success states say different things. A `variant` switch covering both
 * would be longer than the duplication it removes. What the two genuinely
 * share — attribution capture, the POST, error-code mapping — is factored
 * into `useWaitlistSubmit`.
 *
 * Rows from this page carry `utm_source: "build-page"`, which is how they're
 * told apart from plain waitlist signups. The override is applied last, so a
 * `?utm_source=` in the URL does not displace the tag; every other UTM field
 * and the referrer still pass through untouched.
 */

// `MAX_FIELD_LEN` in app/api/waitlist/route.ts clips `building` at 200 chars.
// Enforced here too so the box can't silently swallow the end of a sentence.
const MAX_NOTE_LEN = 200;

export function BuildForm() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const { status, errorMessage, submit } = useWaitlistSubmit({
    utm_source: "build-page",
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({
      email,
      building: note.trim() || null,
      website: honeypotRef.current?.value ?? "",
    });
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-accent-indigo/40 bg-accent-indigo/5 p-8">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-accent-indigo/50 bg-accent-indigo/10">
          <Check className="h-5 w-5 text-text" />
        </div>
        <h3 className="text-xl font-semibold text-text">Got it</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Dennis reads these himself, so the reply comes from a person and
          not always the same week. If you want to start before hearing
          back, the Telegram and the GitHub org are both open — links
          above.
        </p>
      </div>
    );
  }

  const remaining = MAX_NOTE_LEN - note.length;

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
        <label htmlFor="build-website">Website (leave blank)</label>
        <input
          ref={honeypotRef}
          type="text"
          id="build-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="build-email"
          className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted"
        >
          Email
        </label>
        <input
          id="build-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@somewhere.com"
          autoComplete="email"
          className="w-full rounded-md border border-soft bg-surface/60 px-4 py-3 text-sm text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent-indigo/60 focus:bg-surface"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="build-note"
            className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted"
          >
            What you&apos;d work on, and where to look
          </label>
          <span
            className={cn(
              "font-mono text-[11px] tabular-nums",
              remaining <= 20 ? "text-amber-300" : "text-text-muted/70"
            )}
          >
            {remaining}
          </span>
        </div>
        <textarea
          id="build-note"
          rows={4}
          maxLength={MAX_NOTE_LEN}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Foundry tests against the policy engine — github.com/you"
          className="w-full resize-y rounded-md border border-soft bg-surface/60 px-4 py-3 text-sm leading-relaxed text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent-indigo/60 focus:bg-surface"
        />
        <p className="text-xs leading-relaxed text-text-muted/80">
          A GitHub handle, a repo, or one line about the part you&apos;d
          pick up. Short is fine — 200 characters is the field limit.
        </p>
      </div>

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          "group inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-3 text-sm font-medium text-text transition-colors",
          "hover:border-accent-indigo hover:bg-accent-indigo/30",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {status === "submitting" ? "Sending..." : "Send it"}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
