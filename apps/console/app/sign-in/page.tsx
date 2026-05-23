import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";
import { getSessionPubkey, isSessionConfigured } from "@/lib/session";
import { consoleAuthEnabled } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Mission Control",
  description:
    "Sign in to your VDM Nexus agent dashboard by signing a server-issued challenge with your agent secret.",
  robots: { index: false },
};

export default async function SignInPage() {
  // Product-level soft-gate. Mission Control sign-in is intentionally
  // deferred until the agent-creation step is designed — a fresh
  // Phantom wallet shouldn't land on an empty dashboard. The flag flips
  // when the v1 design ships; the route stays here so the URL doesn't
  // 404 in the meantime.
  if (!consoleAuthEnabled()) {
    return <SignInComingSoon />;
  }

  // Hard fail-closed branch: if the HMAC key isn't configured we can't
  // issue a valid challenge OR validate an existing session cookie. Skip
  // the redirect-when-signed-in path and render a graceful notice
  // instead of letting issueChallenge() throw a 500.
  if (!isSessionConfigured()) {
    return <SignInUnavailable />;
  }

  if (await getSessionPubkey()) redirect("/dashboard");

  // Note: the challenge cookie is issued by GET /api/sign-in/challenge,
  // which the SignInForm fetches on mount. Next.js 15 disallows
  // `cookies().set()` from a server-component render, so the write
  // has to happen in a Route Handler or Server Action.

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-md px-6 pt-20 pb-16">
        <header>
          <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
            Sign in
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Prove you hold the key.
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Paste your agent secret to sign a one-time challenge. We never
            store it — we only verify the signature and set a 24h session
            cookie scoped to{" "}
            <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[11px] text-text">
              console.vdmnexus.com
            </code>
            .
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
          <SignInForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function SignInComingSoon() {
  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />
      <section className="relative mx-auto w-full max-w-xl px-6 pt-20 pb-16">
        <header>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-accent-indigo">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo" />
            Coming soon
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Sign in is coming soon.
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Mission Control's sign-in flow is in design. We want connecting
            Phantom to land you on a dashboard that's actually useful — even
            if your wallet has never made a signed call. That means an explicit
            "become an agent" step (label, optional first call funding,
            classification) before we ship Phantom auth broadly.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Your public agent profile is already live at{" "}
            <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
              /a/&lt;pubkey&gt;
            </code>{" "}
            — every agent on the rail has a permalink with stats, recent
            receipts, and an ERC-8004 card.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            While you wait
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-text">
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-indigo" />
              <span>
                <a
                  href="https://vdmnexus.com/playground"
                  className="font-medium underline underline-offset-4 transition-colors hover:text-accent-indigo"
                >
                  Try a live mainnet call →
                </a>{" "}
                <span className="text-text-muted">Sponsored credit, no signup.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-indigo" />
              <span>
                <a
                  href="https://vdmnexus.com/agents"
                  className="font-medium underline underline-offset-4 transition-colors hover:text-accent-indigo"
                >
                  Browse agents on the rail →
                </a>{" "}
                <span className="text-text-muted">Public directory of every agent that's called the API.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-indigo" />
              <span>
                <a
                  href="https://docs.vdmnexus.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium underline underline-offset-4 transition-colors hover:text-accent-indigo"
                >
                  Docs + quickstart ↗
                </a>{" "}
                <span className="text-text-muted">Spin up a headless agent via the SDK in minutes.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-indigo" />
              <span>
                <a
                  href="https://x.com/vdmnexus"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium underline underline-offset-4 transition-colors hover:text-accent-indigo"
                >
                  Follow @vdmnexus on X ↗
                </a>{" "}
                <span className="text-text-muted">We ship updates here first.</span>
              </span>
            </li>
          </ul>
        </div>

        <p className="mt-6 text-[11px] text-text-muted">
          <Link
            href="/"
            className="underline underline-offset-4 transition-colors hover:text-text"
          >
            ← Back to Mission Control
          </Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}

function SignInUnavailable() {
  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />
      <section className="relative mx-auto w-full max-w-md px-6 pt-20 pb-16">
        <header>
          <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
            Sign in
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Sign-in is being configured.
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Mission Control's sign-in flow isn't available right now —
            please check back shortly. Your public agent profile is
            unaffected and remains live at{" "}
            <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[11px] text-text">
              /a/&lt;pubkey&gt;
            </code>
            .
          </p>
        </header>
        <div className="mt-6 rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
          <p className="text-xs text-text-muted">
            If you're the operator and seeing this in production, set{" "}
            <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[11px] text-text">
              CONSOLE_SESSION_SECRET
            </code>{" "}
            on the Vercel project and redeploy.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
