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

export const metadata: Metadata = {
  title: "$VDMN — the token for signed inference",
  description:
    "$VDMN is the credibility currency of VDM Nexus. Fair-launched on Solana via Bankr, traded on Raydium, and wired to the signed-inference rail.",
  alternates: { canonical: "https://vdmnexus.com/token" },
  openGraph: {
    title: "$VDMN — the token for signed inference",
    description:
      "Fair-launched on Solana via Bankr. Holder discount on signed inference, fee burn from real revenue.",
    url: "https://vdmnexus.com/token",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "$VDMN — the token for signed inference",
    description:
      "Fair-launched on Solana via Bankr. Holder discount on signed inference, fee burn from real revenue.",
  },
};

const TOKEN_STATS: Array<{ label: string; value: string; mono?: boolean }> = [
  { label: "Mint address", value: "{{TODO: fill post-launch}}", mono: true },
  { label: "Total supply", value: "{{TODO: fill post-launch}}" },
  { label: "Holders", value: "{{TODO: fill post-launch}}" },
  { label: "Market cap", value: "{{TODO: fill post-launch}}" },
];

const UTILITY = [
  {
    stage: "In dev",
    title: "Holder discount",
    body:
      "Holding $VDMN unlocks a per-call discount on /v1/chat/completions. Discount tiers and threshold finalize before mainnet flip.",
  },
  {
    stage: "Next 30 days",
    title: "Fee burn from inference revenue",
    body:
      "A slice of the protocol's settled USDC inference revenue auto-buys $VDMN on Raydium and burns it. Real cashflow, on-chain provable.",
  },
  {
    stage: "Long-term",
    title: "Facilitator staking",
    body:
      "Operators running an x402 facilitator stake $VDMN as a slashable bond against receipt misbehavior. Live when the facilitator role decentralizes.",
  },
];

export default function TokenPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Token</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                <span className="text-gradient">$VDMN</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                The token for signed inference. Fair-launched on Solana,
                wired to the same rail every receipt is signed against.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/whitepaper"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Read the whitepaper
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="https://verify.vdmnexus.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  Verify a receipt
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section className="pt-0">
          <FadeIn>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TOKEN_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-soft bg-surface/60 px-5 py-4 backdrop-blur"
                >
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                    {s.label}
                  </div>
                  <div
                    className={
                      s.mono
                        ? "mt-2 truncate font-mono text-sm text-text"
                        : "mt-2 text-lg font-semibold tracking-tight text-text sm:text-xl"
                    }
                    title={s.value}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Stats marked <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[11px]">{`{{TODO}}`}</code>{" "}
              populate from the Bankr launch transaction and on-chain
              indexers post-deploy.
            </p>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Mechanism</SectionEyebrow>
            <SectionHeading className="mt-4">
              Fair launch. No team allocation.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-text-muted">
            <p>
              $VDMN launches through Bankr on Solana — a Raydium-anchored
              bonding curve where every buyer pays the same curve price as
              every other buyer at the same moment. No pre-mint, no
              insider round, no team supply, no vesting cliff. Liquidity
              graduates to a Raydium pool once the curve completes.
            </p>
            <p>
              Post-graduation, Bankr's swap fees split{" "}
              <span className="font-mono text-text">50 / 40 / 10</span>{" "}
              between the liquidity pool, the protocol fee-delegate, and
              the Bankr platform. The protocol slice routes to the Squads
              multisig and funds the fee-burn loop described below — every
              swap permanently retires a small amount of $VDMN against the
              inference revenue line.
            </p>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Treasury</SectionEyebrow>
            <SectionHeading className="mt-4">
              ~5–8% bought on-curve. Held in a Squads multisig.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10 grid gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="text-base font-semibold text-text">
                Single-shot, transparent buy
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                The treasury position is a single on-chain buy of 5–8% of
                supply, executed during the launch transaction. The buy
                size and signature are posted publicly in the launch
                thread. Not averaged-in, not topped up later from a hidden
                wallet.
              </p>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-text">
                Squads multisig custody
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Treasury $VDMN is custodied in a Solana Squads multisig,
                rotated from a 1-of-1 launch signer to a multi-signer
                arrangement after the initial buy lands. Multisig address:{" "}
                <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[11px] text-text">
                  {`{{TODO: fill post-launch}}`}
                </code>
              </p>
            </Card>
          </FadeIn>
          <FadeIn className="mt-6 max-w-3xl text-sm text-text-muted">
            <p>
              This is an operating reserve, not a war chest. It pays
              facilitator gas, compute bills, and emergency runway during
              the period before fee-burn revenue covers them. Movements
              are on-chain and signed by multiple keys.
            </p>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Utility</SectionEyebrow>
            <SectionHeading className="mt-4">
              What the token actually does.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {UTILITY.map((u, i) => (
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
        </Section>

        <Section>
          <FadeIn className="max-w-3xl">
            <SectionEyebrow>Disclosure</SectionEyebrow>
            <SectionHeading className="mt-4">
              What $VDMN is, and is not.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10">
            <div className="relative overflow-hidden rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
                    What it is
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
                    <li>
                      A Solana SPL token, fair-launched, no pre-mint, no
                      team allocation.
                    </li>
                    <li>
                      A holder credential that unlocks a discount on
                      protocol inference calls.
                    </li>
                    <li>
                      A receiver of on-chain fee-burn pressure tied to
                      real settled inference revenue.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
                    What it is not
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
                    <li>
                      Not a security, share, profit-share, or investment
                      contract. No return is promised, implied, or
                      guaranteed.
                    </li>
                    <li>
                      Not financial advice. Nothing on this page or in
                      the whitepaper constitutes a solicitation to buy.
                    </li>
                    <li>
                      Not available, intended, or marketed in
                      jurisdictions where the offer would be unlawful —
                      including any restricted persons under applicable
                      EU and US regulations.
                    </li>
                  </ul>
                </div>
              </div>
              <p className="mt-8 text-xs text-text-muted">
                $VDMN can lose its entire value. Bonding-curve tokens are
                volatile, and infrastructure tokens are doubly so.
                Participate only with funds you can lose without
                consequence, and only where it is lawful for you to do so.
              </p>
            </div>
          </FadeIn>
        </Section>

        <Section className="pb-32">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-radial-fade opacity-60"
              />
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div className="max-w-xl">
                  <SectionEyebrow>Trade</SectionEyebrow>
                  <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                    Live charts post-launch.
                  </p>
                  <p className="mt-3 text-sm text-text-muted">
                    Links go live the moment the Bankr launch tx confirms.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="#"
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    Birdeye {`{{TODO}}`}
                  </a>
                  <a
                    href="#"
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    DexScreener {`{{TODO}}`}
                  </a>
                  <Link
                    href="/whitepaper"
                    className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                  >
                    Whitepaper
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section>
      </main>
      <Footer />
    </>
  );
}
