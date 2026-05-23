import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
} from "@/components/section";
import { Card } from "@/components/card";
import { FadeIn } from "@/components/fade-in";
import { launchLive } from "@/lib/launch-flag";

export const metadata: Metadata = {
  title: "Pricing — VDM Nexus",
  description:
    "Per-call signed inference, USDC-denominated. OpenRouter cost passed through 1:1 plus a $0.01 receipt fee — 50% routes to a public $NEXUS buy-and-burn pool. No subscription. No minimum.",
  alternates: { canonical: "https://vdmnexus.com/pricing" },
  openGraph: {
    title: "Pricing — VDM Nexus",
    description:
      "Per-call signed inference, USDC-denominated. No subscription. No minimum. Receipt fee feeds the $NEXUS burn pool.",
    url: "https://vdmnexus.com/pricing",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "Pricing — VDM Nexus",
    description:
      "Per-call signed inference, USDC-denominated. Receipt fee feeds $NEXUS burn pool.",
  },
};

const BREAKDOWN: Array<{
  label: string;
  amount: string;
  detail: string;
  badge?: string;
}> = [
  {
    label: "Inference cost",
    amount: "OpenRouter usage.cost",
    detail:
      "Passed through 1:1 from the upstream model provider's reported USD cost. No markup at the protocol layer. Whatever the call would cost on OpenRouter, that's what the agent pays in USDC.",
    badge: "1:1 pass-through",
  },
  {
    label: "Receipt fee",
    amount: "+ $0.01 USDC",
    detail:
      "Flat per-call fee on every paid /v1/chat/completions and /v1/inference call. Funds the signed-receipt infrastructure: KMS-backed operator signing, on-chain settlement, verifier availability, receipt permalink hosting.",
    badge: "Wire 1 funding source",
  },
];

const FEE_SPLIT: Array<{ pct: string; name: string; detail: string }> = [
  {
    pct: "50%",
    name: "$NEXUS burn pool",
    detail:
      "Accumulates in USDC pre-launch. At launch, a public buy-and-burn bot swaps the pool's USDC for $NEXUS on the pump.fun pool and sends to a public burn address. Live counter on /token. Burn pressure scales with rail usage — every paid call contributes.",
  },
  {
    pct: "50%",
    name: "Protocol treasury",
    detail:
      "Funds KMS signing infrastructure, RPC nodes, verifier hosting, ongoing development, security review, and Spanish legal compliance. Held in USDC, on-chain transparent.",
  },
];

const UTILITY_PREVIEW: Array<{ stage: string; title: string; body: string }> = [
  {
    stage: "Day 30 — Wire 2",
    title: "Holder discount on inference",
    body:
      "Hold ≥ threshold $NEXUS → approximately 20% discount on the USDC inference cost. Exact threshold and discount % published 7 days before the wire goes live. Verified by reading the payer wallet's $NEXUS balance at request time.",
  },
  {
    stage: "Day 60 — Wire 3",
    title: "Bonded-agent fee discount",
    body:
      "Agents that stake $NEXUS into the reputation bond receive an additional per-call fee discount (stacks with Wire 2), plus 2x rate limit and inclusion in the bonded-agents directory. Slashable for misbehavior.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-24 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Pricing</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
                Pay per call.{" "}
                <span className="text-gradient">USDC-denominated.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-text sm:text-lg">
                No subscription, no minimum, no API keys. Every signed
                inference call is a single USDC settlement — inference
                cost passed through 1:1 from OpenRouter, plus a $0.01
                receipt fee. Half of every receipt fee buys and burns
                $NEXUS.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Try a live mainnet call
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="https://docs.vdmnexus.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  Read the docs
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section className="pt-0">
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Per-call breakdown</SectionEyebrow>
            <SectionHeading className="mt-4">
              What a paid call actually costs.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Two components. Pass-through inference cost + flat
              receipt fee. The receipt fee is the only thing Nexus
              charges; everything above that is what the upstream
              model provider charged for the inference.
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {BREAKDOWN.map((b, i) => (
              <FadeIn key={b.label} delay={i * 0.06}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                        {b.label}
                      </div>
                      <div className="mt-2 font-mono text-lg font-semibold text-text sm:text-xl">
                        {b.amount}
                      </div>
                    </div>
                    {b.badge ? (
                      <span className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-text">
                        {b.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text-muted">
                    {b.detail}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="mt-8">
            <div className="rounded-2xl border border-soft bg-surface/60 px-6 py-5 backdrop-blur">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                Worked example — a typical chat call
              </div>
              <div className="mt-3 grid gap-3 font-mono text-sm sm:grid-cols-3">
                <div>
                  <span className="text-text-muted">Inference</span>
                  <div className="text-text">$0.0021 USDC</div>
                  <div className="text-[11px] text-text-muted/70">
                    gpt-4o-mini, ~800 tokens
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Receipt fee</span>
                  <div className="text-text">$0.0100 USDC</div>
                  <div className="text-[11px] text-text-muted/70">
                    flat, all paid calls
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Total</span>
                  <div className="text-text">$0.0121 USDC</div>
                  <div className="text-[11px] text-text-muted/70">
                    settled in one tx
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Where the receipt fee goes</SectionEyebrow>
            <SectionHeading className="mt-4">
              50 / 50. On-chain transparent.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Every receipt fee splits two ways at the protocol layer.
              Both halves are auditable from the{" "}
              <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
                burn_pool_ledger
              </code>
              {" "}view. The burn loop is the load-bearing economic
              mechanism of $NEXUS — every paid call contributes.
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEE_SPLIT.map((s, i) => (
              <FadeIn key={s.name} delay={i * 0.06}>
                <Card className="h-full">
                  <div className="text-3xl font-semibold tracking-tight text-text tabular-nums">
                    {s.pct}
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-text">
                    {s.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {s.detail}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        {launchLive() ? (
          <Section>
            <FadeIn className="max-w-2xl">
              <SectionEyebrow>Holder economics</SectionEyebrow>
              <SectionHeading className="mt-4">
                What $NEXUS does for the per-call price.
              </SectionHeading>
              <p className="mt-5 text-base leading-relaxed text-text-muted">
                Two of the four utility wires affect the per-call price
                directly. See{" "}
                <Link
                  href="/whitepaper"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /whitepaper
                </Link>{" "}
                Section 03 for the full four-wire calendar; this page
                covers only the wires that change the bill.
              </p>
            </FadeIn>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {UTILITY_PREVIEW.map((u, i) => (
                <FadeIn key={u.title} delay={i * 0.08}>
                  <Card className="h-full">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
                      {u.stage}
                    </span>
                    <h3 className="mt-3 text-base font-semibold text-text">
                      {u.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">
                      {u.body}
                    </p>
                  </Card>
                </FadeIn>
              ))}
            </div>
            <FadeIn className="mt-6">
              <p className="text-xs text-text-muted/70">
                Wire 2 and Wire 3 are dated commitments, not shipped
                features. Wire 2 ships within 30 days of token launch;
                Wire 3 within 60. Wire 3 structure may be revised
                pending the Spanish legal scoping memo — see{" "}
                <Link
                  href="/disclosures"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /disclosures
                </Link>
                .
              </p>
            </FadeIn>
          </Section>
        ) : null}

        <Section>
          <FadeIn className="max-w-3xl">
            <SectionEyebrow>Volume / enterprise</SectionEyebrow>
            <SectionHeading className="mt-4">
              Beta pricing only. Enterprise tier ships at v1.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10">
            <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
              <p className="text-base leading-relaxed text-text-muted">
                There is no volume tier, no enterprise SLA, no
                committed-use discount during Beta. The single price is
                the per-call price above. v1 (shipping at $NEXUS
                launch) introduces a Business tier with custom receipt
                schemas, compliance export, SLA, and dedicated support
                — pricing in the $299–$2,000/month range depending on
                contract.
              </p>
              <p className="mt-4 text-base leading-relaxed text-text-muted">
                For enterprise or compliance-driven evaluations now,
                email{" "}
                <a
                  href="mailto:dennis@vdmnexus.com"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  dennis@vdmnexus.com
                </a>
                {" "}with use case and required SLAs. Beta-tier
                evaluations get the founder directly; v1-tier
                contracts land into the Business tier when it ships.
              </p>
            </div>
          </FadeIn>
        </Section>

        <Section className="pb-24">
          <FadeIn>
            <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
              <p className="text-xs text-text-muted">
                Beta pricing — receipt fee is configurable per
                endpoint and may be adjusted before v1 ships. Pricing
                is the v1 commitment; beta-stage may iterate. All
                changes versioned in git and announced on{" "}
                <Link
                  href="/roadmap"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /roadmap
                </Link>
                .
              </p>
            </div>
          </FadeIn>
        </Section>
      </main>
      <Footer />
    </>
  );
}
