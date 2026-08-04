"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared client logic for every form that posts to `/api/waitlist`.
 *
 * Two forms use it today — the homepage waitlist (`components/waitlist-form.tsx`)
 * and the build-page collaborator form (`components/build-form.tsx`). They look
 * different and say different things; what they share is the boring part:
 * capture UTM + referrer on mount, POST, map the route's error codes to human
 * copy. That part lives here so it only has to be right once.
 *
 * The route (`app/api/waitlist/route.ts`) owns email validation, the per-IP-hash
 * rate limit, the honeypot discard, and the confirmation email. This hook does
 * not duplicate any of it.
 */

export type WaitlistStatus = "idle" | "submitting" | "success" | "error";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
};

export type WaitlistSubmitPayload = {
  email: string;
  /** Maps to the `building` column. Clipped to 200 chars server-side. */
  building?: string | null;
  /** Honeypot value. Non-empty → the route accepts and discards. */
  website?: string;
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

function messageForError(code: string | undefined): string {
  switch (code) {
    case "rate_limited":
      return "Too many attempts. Please try again later.";
    case "invalid_email":
      return "Please enter a valid email address.";
    case "service_unavailable":
      return "Temporarily unavailable. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * @param overrides Attribution fields the caller wants to force, applied on
 *   top of whatever the URL carried. The build page uses this to stamp
 *   `utm_source: "build-page"` so those rows are filterable in Supabase.
 */
export function useWaitlistSubmit(overrides: Attribution = {}) {
  const [status, setStatus] = useState<WaitlistStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attributionRef = useRef<Attribution>({});
  const overridesRef = useRef<Attribution>(overrides);
  overridesRef.current = overrides;

  useEffect(() => {
    attributionRef.current = captureAttribution();
  }, []);

  const submit = useCallback(async (payload: WaitlistSubmitPayload) => {
    setErrorMessage(null);

    const email = payload.email.trim();
    if (!email) {
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
          email,
          building: payload.building ?? null,
          website: payload.website ?? "",
          ...attributionRef.current,
          ...overridesRef.current,
        }),
      });

      if (res.ok) {
        setStatus("success");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMessage(messageForError(data.error));
      setStatus("error");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }, []);

  return { status, errorMessage, submit };
}
