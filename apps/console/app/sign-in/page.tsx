import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SignInForm } from "./sign-in-form";
import { getSessionPubkey, isSessionConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Mission Control",
  description:
    "Sign in to your VDM Nexus agent dashboard by signing a server-issued challenge with your agent secret.",
  robots: { index: false },
};

export default async function SignInPage() {
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
