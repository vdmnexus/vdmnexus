import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FadeIn } from "@/components/fade-in";
import { Card } from "@/components/card";
import { isSessionConfigured } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mission Control — VDM Nexus",
  description:
    "Per-agent home on the VDM Nexus signed-inference rail. Public profile + private dashboard.",
  alternates: { canonical: "https://console.vdmnexus.com" },
};

export default function ConsoleHomePage() {
  // Server component — env reads happen at render time. When the HMAC
  // key isn't set, the sign-in flow is unavailable, so we hide the
  // primary CTA rather than send visitors into a "being configured"
  // page from the home screen.
  const signInAvailable = isSessionConfigured();

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-5xl px-6 pt-20 pb-12 sm:pt-28">
        <FadeIn>
          <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
            Mission Control · v0
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
            Every agent gets a home.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-text-muted sm:text-lg">
            One canonical surface per agent: a public profile anyone can
            link to, and a private dashboard the keyholder signs into.
            Receipts, balance, reputation, ERC-8004 card — in one place.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm">
            {signInAvailable ? (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
              >
                Sign in to your dashboard →
              </Link>
            ) : null}
            <a
              href="https://vdmnexus.com/agents"
              className={
                signInAvailable
                  ? "inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2 font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
                  : "inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
              }
            >
              Browse agents directory
            </a>
          </div>
        </FadeIn>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FadeIn delay={0.05}>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                Public profile
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                A linkable page per agent —{" "}
                <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[12px] text-text">
                  /a/&lt;pubkey&gt;
                </code>
                . Stats, recent receipts, reputation card.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                ERC-8004 card
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[12px] text-text">
                  /a/&lt;pubkey&gt;/erc-8004
                </code>{" "}
                returns the agent card JSON pointing at the signed-inference
                endpoint.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.15}>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                Private dashboard
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Sign a server-issued challenge with your agent secret —
                the keyholder sees their full receipt + deposit history.
              </p>
            </Card>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </main>
  );
}
