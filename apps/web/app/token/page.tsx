import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { BurnPoolCounter } from "@/components/burn-pool-counter";
import { launchLive } from "@/lib/launch-flag";

export const metadata: Metadata = {
  title: "$NEXUS — utility token for the signed-inference rail",
  description:
    "$NEXUS is the utility token of the VDM Nexus signed-inference rail. Four wires on a 0/30/60/90 calendar: receipt-fee burn, holder discount, agent reputation bond, verifier staking. Fair launch on pump.fun with USDC pair on Solana.",
  alternates: { canonical: "https://vdmnexus.com/token" },
  openGraph: {
    title: "$NEXUS — utility token for the signed-inference rail",
    description:
      "Fair launch on pump.fun with USDC pair on Solana. 100B supply, mint authority disabled, LP burned at bonding. Four utility wires on a dated 0/30/60/90 calendar.",
    url: "https://vdmnexus.com/token",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "$NEXUS — utility token for the signed-inference rail",
    description:
      "pump.fun with USDC pair on Solana. 100B supply, four wires on 0/30/60/90 calendar. Receipt-fee burn live at launch.",
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
    value: "Burned",
    sub: "pump.fun USDC pair. Burned at bonding.",
  },
  {
    label: "Token contract",
    value: `${TODO}: Solscan link`,
    mono: true,
  },
];

const ALLOCATION = [
  {
    pct: "70%",
    name: "Liquidity pool",
    detail:
      "Seeded into the pump.fun USDC pool on Solana at deploy. LP burned at pump.fun bonding completion — liquidity cannot be withdrawn by the team. USDC pair means dollar-denominated MCAP, no SOL beta.",
    badge: "LP burned at bonding",
  },
  {
    pct: "15%",
    name: "Treasury vault",
    detail:
      "Held by a Squads multisig vesting program on Solana. Vault-locked 90 days from deploy, then linear-vested over 12 months. Vesting schedule is immutable and enforced by the on-chain vesting contract. No cliff unlocks at the end of the lockup — vesting begins smoothly on day 91.",
    badge: "Locked 90d + 12mo vest",
  },
  {
    pct: "10%",
    name: "Retroactive airdrop",
    detail:
      "Held in a non-spendable Squads multisig until criteria are published within 90 days of launch. Recipients vest over 6 months from the distribution date. Targets early agents on the signed-inference rail and early signed-receipt verifiers.",
    badge: "Criteria within 90d",
  },
  {
    pct: "5%",
    name: "Community pool",
    detail:
      "No lockup. Publicly tracked Squads multisig on Solana. Used for ecosystem incentives, pattern-library bounties (Layer 5), and partner integrations. Every outflow is on-chain and signed by multiple keys.",
    badge: "Publicly tracked",
  },
];

const UTILITY = [
  {
    stage: "Wire 1 — Day 0 (launch)",
    title: "Receipt fee + buy-and-burn",
    body:
      "Every paid call adds a $0.01 USDC receipt fee. 50% routes to a public buy-and-burn bot — USDC → $NEXUS swap on the pump.fun pool → burn to a public address. Live counter below. Burn pressure scales with rail usage.",
  },
  {
    stage: "Wire 2 — Day 30",
    title: "Holder discount on inference",
    body:
      "Holders of a threshold balance receive an approximately 20% discount on /v1/chat/completions. Exact threshold and discount percentage finalize 7 days before the wire goes live.",
  },
  {
    stage: "Wire 3 — Day 60",
    title: "Agent reputation bond",
    body:
      "Agents stake $NEXUS into a non-custodial bond. Unlocks trust badge on /agents, additional per-call discount, 2× rate limit. Slashable for misbehavior; 14-day unbonding.",
  },
  {
    stage: "Wire 4 — Day 90",
    title: "Verifier staking + revenue share",
    body:
      "Stake $NEXUS to run a verifier node. 40% of verify.vdmnexus.com paid-tier revenue distributes pro-rata to staked verifiers, weighted by stake × uptime. Slashable for false attestations. Subject to legal scoping memo confirming utility classification.",
  },
];

export default function TokenPage() {
  if (!launchLive()) notFound();
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
                $NEXUS is the utility token of the VDM Nexus
                signed-inference rail. Four wires on a 0/30/60/90
                calendar — receipt-fee burn live at launch, holder
                discount Day 30, agent reputation bond Day 60, verifier
                staking Day 90. Fair launch on pump.fun with USDC pair
                on Solana.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-text-muted">
                100B supply. Mint authority disabled at deploy. LP
                burned at pump.fun bonding. USDC-denominated pricing.
                No presale. No team allocation. No insider rounds.
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
              pump.fun USDC pair fair launch on Solana.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card>
              <h3 className="text-base font-semibold text-text">
                Mint authority disabled
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Mint authority is revoked at deploy. Supply is fixed at
                100,000,000,000 $NEXUS forever. Verifiable on Solscan at{" "}
                <Placeholder text="{{TODO}}: Solscan link to token contract" />
                .
              </p>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-text">
                Liquidity pool burned
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                LP tokens burned at pump.fun bonding completion.
                Liquidity cannot be withdrawn by the team. Verifiable on
                Solscan at{" "}
                <Placeholder text="{{TODO}}: Solscan link to LP burn tx" />
                .
              </p>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-text">
                USDC-denominated pricing
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Pair is $NEXUS/USDC, not $NEXUS/SOL. MCAP is reported in
                dollars — no SOL volatility riding under the token's
                chart. Serious-buyer profile, higher MCAP ceiling at
                pump.fun's ~$58K bonding threshold.
              </p>
            </Card>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Treasury</SectionEyebrow>
            <SectionHeading className="mt-4">
              Three separate Squads multisigs. Not bundled, not clustered.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Three Squads multisigs on Solana, each separately
              deployed, each with its own published address. Bubblemaps
              Solana will render these as three distinct allocations,
              not as a clustered wallet. Each multisig is funded only
              from the deployer wallet — no farmed-wallet origin chains.
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
                  immutable, enforced by the on-chain Squads vesting
                  program on Solana. The treasury cannot sell during
                  the 90-day lockup. After the lockup ends, the maximum
                  daily unlock is approximately 41M $NEXUS (about 0.04%
                  of supply per day) on a smooth linear curve. No cliff
                  unlocks.
                </p>
                <p className="mt-4 font-mono text-xs text-text-muted">
                  Recipient: <Placeholder text="{{TODO}}: Squads address (Solana)" />
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
                  <Placeholder text="{{TODO}}: Squads address (Solana)" />
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
                  5% of supply, no lockup, publicly tracked Squads
                  multisig on Solana. Funds ecosystem incentives,
                  pattern-library bounties (Layer 5), and partner
                  integrations. Every outflow is on-chain and signed by
                  multiple keys.
                </p>
                <p className="mt-4 font-mono text-xs text-text-muted">
                  Recipient: <Placeholder text="{{TODO}}: Squads address (Solana)" />
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
                  <Placeholder text="{{TODO}}: deployer wallet address (Solana)" />
                  <p className="mt-2 text-xs text-text-muted">
                    Built and deployed from this address, public on
                    Solscan. The deployer wallet does not hold a team
                    allocation — all 30% non-LP supply sits in the three
                    Squads multisigs above.
                  </p>
                </VerifyRow>
                <VerifyRow label="Token contract">
                  <Placeholder text="{{TODO}}: Solscan link" />
                  <p className="mt-2 text-xs text-text-muted">
                    Mint authority disabled at deploy. Supply is 100B,
                    fixed forever.
                  </p>
                </VerifyRow>
                <VerifyRow label="LP burn tx">
                  <Placeholder text="{{TODO}}: Solscan link" />
                  <p className="mt-2 text-xs text-text-muted">
                    LP tokens burned at pump.fun bonding completion.
                    Liquidity cannot be withdrawn by the team.
                  </p>
                </VerifyRow>
                <VerifyRow label="Wallet clustering">
                  <Placeholder text="{{TODO}}: Bubblemaps Solana link" />
                  <p className="mt-2 text-xs text-text-muted">
                    Three Squads multisigs render as three distinct
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
          <FadeIn className="mt-12">
            <BurnPoolCounter />
          </FadeIn>
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
                      An SPL token on Solana, fair-launched via
                      pump.fun with USDC pair. No presale, no team
                      allocation, no insider rounds.
                    </li>
                    <li>
                      A utility token for the signed-inference rail
                      with four mechanical on-chain wires on a
                      0/30/60/90 calendar (receipt-fee burn, holder
                      discount, agent reputation bond, verifier
                      staking). See{" "}
                      <Link
                        href="/whitepaper"
                        className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                      >
                        /whitepaper
                      </Link>{" "}
                      Section 03.
                    </li>
                    <li>
                      Receiver of on-chain buy-and-burn pressure tied
                      to real settled inference revenue, live at
                      launch via Wire 1.
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
                    Links resolve the moment the pump.fun deploy
                    transaction confirms. Squads addresses are
                    published 24–48 hours before launch.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    pump.fun <Placeholder text="{{TODO}}" />
                  </span>
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    DexScreener Solana <Placeholder text="{{TODO}}" />
                  </span>
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text-muted"
                  >
                    Solscan <Placeholder text="{{TODO}}" />
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
