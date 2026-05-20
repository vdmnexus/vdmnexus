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
  title: "$NEXUS — discount token for signed inference",
  description:
    "$NEXUS holders get discounted USDC pricing on cryptographically-signed AI inference calls. Fair launch on Clanker v4 on Base. 15% vault locked 90 days then linear-vested 12 months.",
  alternates: { canonical: "https://vdmnexus.com/token" },
  openGraph: {
    title: "$NEXUS — discount token for signed inference",
    description:
      "Fair launch on Clanker v4 on Base. 100B supply, mint authority disabled, LP locked. Holder discount on /v1/chat/completions within 30 days of launch.",
    url: "https://vdmnexus.com/token",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "$NEXUS — discount token for signed inference",
    description:
      "Fair launch on Clanker v4 on Base. 100B supply, mint authority disabled, LP locked. Holder discount within 30 days of launch.",
  },
};

const TODO = "{{TODO}}";

const STATS: Array<{ label: string; value: string; sub?: string; mono?: boolean }> = [
  {
    label: "Total supply",
    value: "100,000,000,000",
    sub: "100B $NEXUS, fixed forever",
  },
  {
    label: "Mint authority",
    value: "Disabled",
    sub: "Revoked at deploy. Supply cannot grow.",
  },
  {
    label: "LP",
    value: "Locked",
    sub: "Clanker v4. Access keys burned.",
  },
  {
    label: "Token contract",
    value: `${TODO}: Basescan link`,
    mono: true,
  },
];

const ALLOCATION = [
  {
    pct: "70%",
    name: "Liquidity pool",
    detail:
      "Seeded into the Clanker v4 pool on Base at deploy. LP tokens not held by the team — access keys burned at deploy. Liquidity cannot be withdrawn.",
    badge: "LP locked",
  },
  {
    pct: "15%",
    name: "Treasury vault",
    detail:
      "Vault-locked 90 days from deploy, then linear-vested over 12 months. Vesting schedule is immutable and enforced by the Clanker v4 vault contract. No cliff unlocks at the end of the lockup — vesting begins smoothly on day 91.",
    badge: "Locked 90d + 12mo vest",
  },
  {
    pct: "10%",
    name: "Retroactive airdrop",
    detail:
      "Held in a non-spendable account until criteria are published within 90 days of launch. Recipients vest over 6 months from the distribution date. Targets early agents on the signed-inference rail and early signed-receipt verifiers.",
    badge: "Criteria within 90d",
  },
  {
    pct: "5%",
    name: "Community pool",
    detail:
      "No lockup. Publicly tracked Safe multisig. Used for ecosystem incentives, partner integrations, and event sponsorships. Every outflow is on-chain and signed by multiple keys.",
    badge: "Publicly tracked",
  },
];

const UTILITY = [
  {
    stage: "Live at launch",
    title: "Tradeable on Base",
    body:
      "Token live on Clanker v4 pool. Allocations verifiable on Basescan and Bubblemaps within minutes of the deploy transaction.",
  },
  {
    stage: "Within 30 days",
    title: "Holder discount on inference",
    body:
      "Holders of a threshold balance receive an approximately 20% discount on /v1/chat/completions. Exact threshold and discount percentage finalize before the wire goes live.",
  },
  {
    stage: "Later",
    title: "Fee burn from inference revenue",
    body:
      "A slice of the protocol's settled USDC inference revenue routes to on-chain buybacks of $NEXUS that are burned. Tied to real settled call volume, on-chain provable.",
  },
];

export default function TokenPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-24 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Token</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                <span className="text-gradient">$NEXUS</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-text sm:text-lg">
                $NEXUS holders will get discounted USDC pricing on
                cryptographically-signed AI inference calls — discount
                wire live within 30 days of launch. Fair launch on
                Clanker v4 on Base. 15% vault locked 90 days then
                linear-vested 12 months.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-text-muted">
                100B supply. Mint authority disabled at deploy. LP locked.
                MEV protection enabled. No presale. No team allocation. No
                insider rounds.
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
              {STATS.map((s) => (
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
                        ? "mt-2 truncate font-mono text-xs text-text-muted"
                        : "mt-2 text-lg font-semibold tracking-tight text-text tabular-nums sm:text-xl"
                    }
                    title={s.value}
                  >
                    {s.mono ? <Placeholder text={s.value} /> : s.value}
                  </div>
                  {s.sub ? (
                    <div className="mt-1.5 text-[11px] leading-snug text-text-muted">
                      {s.sub}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Allocation</SectionEyebrow>
            <SectionHeading className="mt-4">
              70 / 15 / 10 / 5. Every slice on-chain.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              No presale. No team allocation. No insider rounds. The 15%
              vault is contract-locked for the first 90 days and
              linear-vested over the following 12 months — the team
              cannot sell during the lockup, and after the lockup ends
              the maximum daily unlock is approximately 41M $NEXUS
              (about 0.04% of supply per day) on a smooth linear curve.
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {ALLOCATION.map((a, i) => (
              <FadeIn key={a.name} delay={i * 0.06}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-3xl font-semibold tracking-tight text-text tabular-nums">
                      {a.pct}
                    </div>
                    <span className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-text">
                      {a.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-text">
                    {a.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {a.detail}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Mechanism</SectionEyebrow>
            <SectionHeading className="mt-4">
              Clanker v4 fair launch. MEV-protected at deploy.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card>
              <h3 className="text-base font-semibold text-text">
                Mint authority disabled
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Mint authority is revoked at deploy. Supply is fixed at
                100,000,000,000 $NEXUS forever. Verifiable on Basescan at{" "}
                <Placeholder text="{{TODO}}: Basescan link to token contract" />
                .
              </p>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-text">
                Liquidity pool locked
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                LP locked via Clanker v4. LP tokens are not held by the
                team — access keys burned at deploy. Liquidity cannot be
                withdrawn. Verifiable on Basescan at{" "}
                <Placeholder text="{{TODO}}: Basescan link to LP contract" />
                .
              </p>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-text">
                MEV protection enabled
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Clanker v4's native first-swap auction / block-delay
                module is enabled at launch. The first 30 seconds of
                trading are not a sniper free-for-all — the auction
                routes the priority bid back to the LP, not to a private
                bundler.
              </p>
            </Card>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Treasury</SectionEyebrow>
            <SectionHeading className="mt-4">
              Three separate Safe multisigs. Not bundled, not clustered.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Three Safe multisigs on Base, each separately deployed,
              each with its own published address. Bundling tools
              (Bubblemaps and Base-equivalents) will show these as
              distinct allocations, not as a clustered wallet. Each Safe
              is funded only from the deployer wallet — no farmed-wallet
              origin chains.
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <FadeIn>
              <Card className="h-full">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-text tabular-nums">
                    15%
                  </span>
                  <span className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-text">
                    Locked 90d + 12mo vest
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-text">
                  Treasury vault
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  15% of supply, locked 90 days from launch, then
                  linear-vested over 12 months. Vesting schedule
                  immutable, enforced by the Clanker v4 vault contract.
                  The treasury cannot sell during the 90-day lockup.
                  After the lockup ends, the maximum daily unlock is
                  approximately 41M $NEXUS (about 0.04% of supply per
                  day) on a smooth linear curve. No cliff unlocks.
                </p>
                <p className="mt-4 font-mono text-xs text-text-muted">
                  Recipient: <Placeholder text="{{TODO}}: Safe address" />
                </p>
              </Card>
            </FadeIn>
            <FadeIn delay={0.06}>
              <Card className="h-full">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-text tabular-nums">
                    10%
                  </span>
                  <span className="rounded-full border border-soft bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
                    Non-spendable
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-text">
                  Retroactive airdrop holding
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  10% of supply, held in a non-spendable account until
                  the airdrop criteria are published within 90 days of
                  launch. On distribution, recipients vest over 6
                  months. Designed to reward early agents on the
                  signed-inference rail and early users of the verifier.
                </p>
                <p className="mt-4 font-mono text-xs text-text-muted">
                  Holding account:{" "}
                  <Placeholder text="{{TODO}}: Safe address" />
                </p>
              </Card>
            </FadeIn>
            <FadeIn delay={0.12}>
              <Card className="h-full">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-text tabular-nums">
                    5%
                  </span>
                  <span className="rounded-full border border-soft bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
                    Publicly tracked
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-text">
                  Community pool
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  5% of supply, no lockup, publicly tracked Safe
                  multisig. Funds ecosystem incentives, partner
                  integrations, and sponsorships. Every outflow is
                  on-chain and signed by multiple keys.
                </p>
                <p className="mt-4 font-mono text-xs text-text-muted">
                  Recipient: <Placeholder text="{{TODO}}: Safe address" />
                </p>
              </Card>
            </FadeIn>
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Verification</SectionEyebrow>
            <SectionHeading className="mt-4">
              Everything claimed here is checkable on-chain.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10">
            <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
              <dl className="grid gap-6 sm:grid-cols-2">
                <VerifyRow label="Deployer wallet">
                  <Placeholder text="{{TODO}}: deployer wallet address" />
                  <p className="mt-2 text-xs text-text-muted">
                    Built and deployed from this address, public on
                    Basescan. The deployer wallet does not hold a team
                    allocation — all 30% non-LP supply sits in the three
                    Safe multisigs above.
                  </p>
                </VerifyRow>
                <VerifyRow label="Token contract">
                  <Placeholder text="{{TODO}}: Basescan link" />
                  <p className="mt-2 text-xs text-text-muted">
                    Mint authority disabled at deploy. Supply is 100B,
                    fixed forever.
                  </p>
                </VerifyRow>
                <VerifyRow label="LP contract">
                  <Placeholder text="{{TODO}}: Basescan link" />
                  <p className="mt-2 text-xs text-text-muted">
                    Locked via Clanker v4. Access keys burned at deploy.
                  </p>
                </VerifyRow>
                <VerifyRow label="Wallet clustering">
                  <Placeholder text="{{TODO}}: Bubblemaps link" />
                  <p className="mt-2 text-xs text-text-muted">
                    Three Safe multisigs render as three distinct
                    allocations, not as a clustered wallet.
                  </p>
                </VerifyRow>
              </dl>
            </div>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Utility</SectionEyebrow>
            <SectionHeading className="mt-4">
              What the token does, on a timeline.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Stated as commitments with timelines, not as current
              features. On day one the token is tradeable; the discount
              wire goes live within 30 days; the fee-burn wire is
              roadmap.
            </p>
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
              What $NEXUS is, and is not.
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
                      An ERC-20 token on Base, fair-launched via Clanker
                      v4. No presale, no team allocation, no insider
                      rounds.
                    </li>
                    <li>
                      A discount mechanism: holders of a threshold
                      balance pay less USDC per signed inference call.
                    </li>
                    <li>
                      Receiver of on-chain fee-burn pressure tied to
                      real settled inference revenue, on a later
                      timeline.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
                    What it is not
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
                    <li>
                      Not an investment contract. Not a security. Not a
                      promise of returns. No return is implied,
                      promised, or guaranteed.
                    </li>
                    <li>
                      Not a governance token. Not a revenue claim. Not a
                      staking instrument.
                    </li>
                    <li>
                      Not financial advice. Nothing on this page or in
                      the whitepaper is a solicitation to buy.
                    </li>
                    <li>
                      Not available, intended, or marketed in
                      jurisdictions where the offer would be unlawful —
                      including restricted persons under applicable EU
                      and US regulations.
                    </li>
                  </ul>
                </div>
              </div>
              <p className="mt-8 text-xs text-text-muted">
                $NEXUS can lose its entire value. Fair-launch tokens are
                volatile, and infrastructure tokens are doubly so.
                Participate only with funds you can lose without
                consequence, and only where it is lawful for you to do
                so.
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
                    Charts and contracts go live post-deploy.
                  </p>
                  <p className="mt-3 text-sm text-text-muted">
                    Links resolve the moment the Clanker v4 launch
                    transaction confirms. Safe addresses are published
                    24–48 hours before launch.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    DexScreener <Placeholder text="{{TODO}}" />
                  </span>
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    Geckoterminal <Placeholder text="{{TODO}}" />
                  </span>
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

function Placeholder({ text }: { text: string }) {
  return (
    <code className="inline-block rounded border border-dashed border-accent-indigo/40 bg-accent-indigo/5 px-1.5 py-0.5 font-mono text-[11px] text-accent-indigo">
      {text}
    </code>
  );
}

function VerifyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-text">{children}</dd>
    </div>
  );
}
