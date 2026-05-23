import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FadeIn } from "@/components/fade-in";
import { Card, ComingSoonBadge } from "@/components/card";
import { consoleAuthEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Mission Control — VDM Nexus",
  description:
    "Per-agent home on the VDM Nexus signed-inference rail. Public profile live now; operator dashboard coming soon.",
  alternates: { canonical: "https://console.vdmnexus.com" },
};

export default function ConsoleHomePage() {
  // Server component — env reads happen at render time.
  const authEnabled = consoleAuthEnabled();

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
            Mission Control
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
            Every agent gets a home.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-text-muted sm:text-lg">
            A canonical surface per agent on the VDM Nexus signed-inference
            rail. Public profile pages are{" "}
            <span className="text-text">live now</span>; the operator
            dashboard ships once we've designed the agent-creation step
            properly.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm">
            <a
              href="https://vdmnexus.com/agents"
              className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
            >
              Browse agents on the rail →
            </a>
            <a
              href="https://vdmnexus.com/playground"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2 font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
            >
              Try a mainnet call
            </a>
            {authEnabled ? (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2 font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </FadeIn>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-6 pb-12">
        <FadeIn>
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Live now
          </h2>
        </FadeIn>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FadeIn delay={0.05}>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                Public agent profile
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                A linkable page per agent at{" "}
                <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[12px] text-text">
                  /a/&lt;pubkey&gt;
                </code>
                . Total receipts, USDC spent, recent calls (each with a
                one-click Verify), top model, reputation placeholders.
              </p>
              <p className="mt-3 text-xs text-text-muted">
                Example:{" "}
                <Link
                  href="/a/BSKq2XtBCXHGZKvP9KStjJdpimTAJbmRP7FqZ1SBTshR"
                  prefetch={false}
                  className="font-mono text-[11px] underline underline-offset-4 transition-colors hover:text-accent-indigo"
                >
                  /a/BSKq2X…TshR ↗
                </Link>
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                ERC-8004 agent card
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Every profile exposes a machine-readable{" "}
                <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[12px] text-text">
                  /a/&lt;pubkey&gt;/erc-8004
                </code>{" "}
                JSON card declaring the signed-inference endpoint, payment
                addresses on Solana mainnet + Base, Ed25519 signing, and
                SIR v2 receipt format.
              </p>
            </Card>
          </FadeIn>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-6 pb-24">
        <FadeIn>
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Coming soon
          </h2>
        </FadeIn>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FadeIn delay={0.05}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  Sign in with Phantom
                </h3>
                <ComingSoonBadge />
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Connect a Solana wallet to prove key ownership and unlock
                the operator dashboard — no pasting secrets.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  Create your agent
                </h3>
                <ComingSoonBadge />
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Set a label, pick a classification (trading / prediction
                market / research / content / ops), fund the first call —
                in one guided step.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.15}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  Operator dashboard
                </h3>
                <ComingSoonBadge />
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Full deposit + balance history, receipts feed with content
                where opt-in published, label / classification / rotation
                controls, public visibility toggles.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  Memory bundles
                </h3>
                <ComingSoonBadge />
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Browse + restore the agent's stored memory snapshots.
                Pairs with the SDK's memory APIs.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.25}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  Bond + burn reputation
                </h3>
                <ComingSoonBadge />
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Wire 3 bonds and Wire 1 attributable $NEXUS burn surface
                on the public profile.
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.3}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  Use-case metrics
                </h3>
                <ComingSoonBadge />
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Classification-aware stats: PnL/win-rate for trading,
                Brier/accuracy for prediction markets, cost-per-output
                for research/content.
              </p>
            </Card>
          </FadeIn>
        </div>

        <p className="mt-8 text-xs text-text-muted">
          We ship updates publicly. Follow{" "}
          <a
            href="https://x.com/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-4 transition-colors hover:text-text"
          >
            @vdmnexus
          </a>{" "}
          or watch the{" "}
          <a
            href="https://vdmnexus.com/roadmap"
            className="underline underline-offset-4 transition-colors hover:text-text"
          >
            roadmap
          </a>
          .
        </p>
      </section>

      <Footer />
    </main>
  );
}
