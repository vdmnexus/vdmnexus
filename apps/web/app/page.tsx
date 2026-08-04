import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
} from "@/components/section";
import { Card } from "@/components/card";
import { WaitlistForm } from "@/components/waitlist-form";
import { FadeIn } from "@/components/fade-in";
import { WaitlistProvider } from "@/components/waitlist-context";
import { launchLive } from "@/lib/launch-flag";

const GITHUB_URL = "https://github.com/vdmnexus/vdmnexus";

/**
 * Homepage. One brand — VDM Nexus. One product — Rienda, the agent vault.
 *
 * The signed-inference rail (receipts, x402, the SDKs) is live and has real
 * callers, so it keeps every route it had. It just stops being marketed as
 * a second product and appears here as "the technology underneath" — the
 * thing that makes a vault's decision history checkable by someone who
 * doesn't trust us.
 *
 * Status framing is load-bearing, not decoration: in development, testnet
 * first, mainnet gated behind an external audit and a legal review. No
 * dates, no performance claims, no token language outside the launch-gated
 * /token and /whitepaper routes.
 */
export default function Home() {
  return (
    <WaitlistProvider>
      <Nav />
      <main>
        <Hero />
        <WhatItIs />
        <FounderOrigin />
        <Guardrails />
        <ComputeBudget />
        <UnderTheHood />
        {launchLive() ? <NexusToken /> : null}
        <Status />
        <ForDevelopers />
        <OpenSource />
        <Waitlist />
      </main>
      <Footer />
    </WaitlistProvider>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GridBg />
      <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-24 sm:pb-32 sm:pt-32">
        <FadeIn>
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <SectionEyebrow>Rienda · the agent vault</SectionEyebrow>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
                In development · testnet first
              </span>
            </div>
            {/*
              Canonical brand line. One phrasing across the whole site —
              homepage, /rienda, metadata, OG. The supporting line sits
              directly beneath so a cold reader learns what the product is
              in the next breath. Don't fork it into a variant.
            */}
            <h1 className="mx-auto mt-8 max-w-4xl text-balance text-5xl font-semibold tracking-tight text-text sm:text-6xl md:text-7xl">
              The model never holds{" "}
              <span className="text-gradient">the keys</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-xl font-medium text-text sm:text-2xl">
              Agent vaults. Guardrails in the contract, not the prompt.
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
              Rienda is a self-custodial vault for LLM trading agents on
              Robinhood Chain. The vault holds the capital and enforces the
              risk policy on-chain. The agent gets a session key that submits
              trade intents and does nothing else — it cannot withdraw, cannot
              change a limit, cannot grant itself either.
            </p>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base font-medium text-text sm:text-lg">
              Losses get bounded, not prevented. That is the whole promise.
            </p>
            <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/app"
                className="group inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
              >
                Connect a wallet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/rienda"
                className="group inline-flex items-center justify-center gap-2 rounded-md border border-soft bg-surface/60 px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
              >
                Read the ten guardrails
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-sm text-text-muted/80">
              Nothing here accepts deposits today. The vault contracts deploy
              to Robinhood Chain testnet (chain id 46630) first; mainnet waits
              on an external audit and a legal review. What&apos;s already
              live is the rail underneath — see{" "}
              <Link
                href="/security"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text"
              >
                /security
              </Link>{" "}
              for what it does and doesn&apos;t guarantee.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// Three claims, each one a mechanism rather than an adjective. Every line
// here has to be true of the contracts as specced, not of an aspiration.
function WhatItIs() {
  const facts = [
    {
      title: "Self-custodial",
      body: "Deposits sit in a vault contract owned by you. VDM Nexus never holds a key and cannot move funds. The kill switch — halt trading, withdraw everything — sits above the agent's authority, where the agent can't reach it.",
    },
    {
      title: "Guardrails in contract code",
      body: "Position caps, loss limits, drawdown throttles, an asset whitelist. Every trade intent is checked against all ten before it executes. A jailbroken model still can't talk its way past a revert.",
    },
    {
      title: "A decision history you can check",
      body: "Each trade links to the Ed25519-signed receipt of the inference that proposed it. Anyone the owner shows it to can verify the chain — this exact model output produced this exact trade — without trusting us.",
    },
  ];
  return (
    <Section className="pt-0">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>What it is</SectionEyebrow>
        <SectionHeading className="mt-4">Where the limits live.</SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Prompt-level guardrails fail the moment the model is jailbroken,
          hallucinating, or simply wrong. Rienda assumes all three will
          happen and puts the limits where the model can&apos;t reach them:
          the model proposes, the contract disposes.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {facts.map((f, i) => (
          <FadeIn key={f.title} delay={i * 0.06}>
            <Card className="h-full">
              <h3 className="text-base font-semibold text-text">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {f.body}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// Narrow founder-voice section. Lands the "why this exists" hook in 30
// seconds for hackathon judges, grant officers, and cold visitors.
// Reference shape: Nova Wallet's "$300K lost to malware" — a specific
// moment, a specific stake, the trigger. The placeholder string is
// intentional — founder fills the prose before the next public-surface PR;
// the visual treatment is production-ready.
function FounderOrigin() {
  return (
    <section id="founder-origin" className="relative">
      <div className="mx-auto w-full max-w-3xl px-6 pb-10 pt-6 sm:pb-14 sm:pt-8">
        <FadeIn>
          <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Why this exists
            </div>
            <p className="mt-4 text-base leading-relaxed text-text sm:text-lg">
              {`{{FOUNDER VOICE — replace with 3-5 sentences in your own voice. Structure: a specific moment + a specific dollar amount or trust failure + "that's when I started building." Reference: Nova Wallet's "$300K lost to malware" hook lands in 30 seconds. Avoid corporate framing. Avoid product features. Just the moment.}}`}
            </p>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              — Dennis van der Meulen, founder
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// Four of the ten, chosen because they're the ones that answer "what stops
// the obvious disaster". The full list lives at /rienda.
function Guardrails() {
  const guardrails = [
    {
      n: "01",
      title: "Position caps + gross exposure",
      body: "No single asset can exceed its configured share of the vault, and total open exposure is capped on top of that. An intent that would breach either reverts before it touches a venue.",
    },
    {
      n: "03",
      title: "Daily realized loss limit",
      body: "Once realized losses hit the day's limit, the vault accepts risk-reducing intents only until the window resets. A bad day stops being a worse one.",
    },
    {
      n: "04",
      title: "Drawdown throttles",
      body: "Past the first threshold, permitted sizing halves. Past the second, the vault goes risk-reducing-only. Recovery has to be earned at reduced size.",
    },
    {
      n: "09",
      title: "No leverage, structurally",
      body: "The vault cannot borrow. No margin means no margin call, no liquidation cascade, and no path to owing more than the vault holds.",
    },
  ];
  return (
    <Section id="guardrails">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Four of ten</SectionEyebrow>
        <SectionHeading className="mt-4">
          Every intent passes all ten, or it reverts.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          The guardrails compose — an intent has to clear each one to
          execute. None of them read the model&apos;s prose. They only read
          its orders, which is why none of them can be argued with.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {guardrails.map((g, i) => (
          <FadeIn key={g.n} delay={Math.min(i, 3) * 0.05}>
            <Card className="h-full">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-accent-indigo">
                  {g.n}
                </span>
                <h3 className="text-base font-semibold text-text">
                  {g.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {g.body}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
      <FadeIn className="mt-10">
        <Link
          href="/rienda#guardrails"
          className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
        >
          All ten guardrails, in full
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </FadeIn>
    </Section>
  );
}

function ComputeBudget() {
  return (
    <Section id="compute-budget">
      <FadeIn>
        <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
          <SectionEyebrow>The compute budget</SectionEyebrow>
          <h2 className="mt-4 max-w-2xl text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Agents that don&apos;t earn, don&apos;t think.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted">
            Inference costs money, so the vault meters it against
            performance. Each day the agent gets a survival minimum plus a
            share of the 7-day moving average of its{" "}
            <span className="text-text">realized</span> PnL, hard-capped at
            the top. Unrealized gains buy nothing. Sustained losses shrink
            the allowance toward the minimum, and in that state the agent may
            only submit risk-reducing intents — enough compute to get
            smaller, not to dig deeper.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
            The allowance is spent through x402: per-call USDC, one signed
            receipt per call. The design assumes most trading strategies lose
            money. That assumption is why the budget exists.
          </p>
          <div className="mt-8">
            <Link
              href="/rienda#compute-budget"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
            >
              How the allowance is calculated
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}

// The demoted trust rail. Live, load-bearing, and now framed as the thing
// that makes a vault's history checkable — not as a second product.
function UnderTheHood() {
  const pieces: Array<{
    title: string;
    body: string;
    href: string;
    external?: boolean;
  }> = [
    {
      title: "Signed inference",
      body: "Every LLM call returns an Ed25519-signed SIR v2 receipt — prompt hash, response hash, model, cost, settlement. The receipt is what a trade points back at.",
      href: "/inference",
    },
    {
      title: "Five-check verification",
      body: "Recompute both hashes, check the operator signature, confirm the on-chain transfer, match the payer. Run it yourself or paste a receipt into the hosted verifier.",
      href: "/verify",
    },
    {
      title: "x402 pay-per-call",
      body: "USDC per call on Solana and Base mainnet, live since 2026-05-21. No accounts, no API keys — the payer wallet is the identity. This is how a vault pays for its own thinking.",
      href: "/pricing",
    },
    {
      title: "Receipts + agent directory",
      body: "The public feed of signed receipts on the rail, and every agent that has called it. Both open, both free to read.",
      href: "/receipts",
    },
  ];
  return (
    <Section id="under-the-hood">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Under the hood</SectionEyebrow>
        <SectionHeading className="mt-4">
          The rail that makes the history checkable.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          A vault bounds what an agent can lose. It doesn&apos;t, on its own,
          tell you why the agent did what it did. That part comes from the
          signed-inference rail VDM Nexus has been running on Solana and Base
          mainnet since 2026-05-21 — mainnet-live infrastructure, not a
          diagram.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {pieces.map((p, i) => (
          <FadeIn key={p.title} delay={Math.min(i, 3) * 0.05}>
            <Link href={p.href} className="block h-full">
              <div className="group flex h-full flex-col rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur transition-colors hover:border-accent-indigo/40">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-text">
                    {p.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 flex-none text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-indigo" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  {p.body}
                </p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

function NexusToken() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>$NEXUS</SectionEyebrow>
        <SectionHeading className="mt-4">
          The utility token of the rail underneath.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Four wires on a 0/30/60/90 calendar. Each wire is a concrete
          on-chain mechanism with a public ship date. Fair launch into a
          Uniswap v4 USDC pool with a custom fee-burn hook on Robinhood
          Chain. 100B fixed supply, no team allocation, no presale.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
            Day 0 · launch
          </span>
          <h3 className="mt-3 text-base font-semibold text-text">
            Wire 1 — Receipt fee burn
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            $0.01 USDC per call. 50% routes to a public buy-and-burn flow
            through the Uniswap v4 pool. Burn pressure scales with rail
            usage.
          </p>
        </Card>
        <Card>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
            Day 30
          </span>
          <h3 className="mt-3 text-base font-semibold text-text">
            Wire 2 — Holder discount
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Hold ≥ threshold $NEXUS → approximately 20% discount on
            /v1/chat/completions. Threshold published 7 days prior.
          </p>
        </Card>
        <Card>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
            Day 60
          </span>
          <h3 className="mt-3 text-base font-semibold text-text">
            Wire 3 — Agent reputation bond
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Stake $NEXUS → trust badge + additional fee discount + 2× rate
            limit. Slashable. 14-day unbonding.
          </p>
        </Card>
        <Card>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
            Day 90
          </span>
          <h3 className="mt-3 text-base font-semibold text-text">
            Wire 4 — Verifier staking
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Stake $NEXUS to run a verifier node. 40% of verify SaaS revenue
            distributes to staked verifiers.
          </p>
        </Card>
      </div>
      <FadeIn className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/token"
            className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            Read the $NEXUS plan
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/whitepaper"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
          >
            Whitepaper
          </Link>
          <Link
            href="/disclosures"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text"
          >
            Disclosures
          </Link>
        </div>
      </FadeIn>
    </Section>
  );
}

// The status table is the honesty gate. If a line here can't be defended
// against the repo, it doesn't belong on the page.
function Status() {
  const items: Array<{ label: string; state: string }> = [
    { label: "Rienda protocol spec", state: "complete" },
    {
      label: "Token + Uniswap v4 fee-burn hook contracts",
      state: "built — 26 passing tests",
    },
    { label: "Vault + policy engine (M1)", state: "in development" },
    { label: "VaultFactory deploy — Robinhood Chain testnet", state: "next" },
    {
      label: "Rienda mainnet",
      state: "gated behind external audit + legal review",
    },
    {
      label: "Signed-inference rail (Solana + Base)",
      state: "mainnet live since 2026-05-21",
    },
    { label: "Third-party security audit", state: "none scheduled" },
  ];
  return (
    <Section id="status">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Status</SectionEyebrow>
        <SectionHeading className="mt-4">Where it stands.</SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          No dates. No performance claims — nothing has traded, so there is
          no track record to show yet.
        </p>
      </FadeIn>
      <FadeIn className="mt-8 max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 border-b border-soft px-5 py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="text-sm font-medium text-text">
                {item.label}
              </span>
              <span className="font-mono text-xs text-text-muted">
                {item.state}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>
    </Section>
  );
}

// The developer surface is demoted in the IA, not removed. These packages
// are published and have callers; the links stay one click from the
// homepage so nobody integrating today has to hunt.
function ForDevelopers() {
  const links: Array<{ label: string; href: string; external?: boolean }> = [
    { label: "SDK", href: "/sdk" },
    { label: "Docs", href: "https://docs.vdmnexus.com", external: true },
    { label: "Playground", href: "/playground" },
    { label: "Pricing", href: "/pricing" },
    { label: "Points", href: "/points" },
    { label: "Console", href: "https://console.vdmnexus.com", external: true },
  ];
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>For developers</SectionEyebrow>
        <SectionHeading className="mt-4">
          Eight packages, still shipping.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Six on npm, two on PyPI, all MIT. Ed25519 identity, the x402
          client, paywall middleware for Express / Hono / Next.js, an MCP
          server, and providers for the Vercel AI SDK, Mastra, and LangChain.
          They&apos;re what Rienda is built on, and they keep working
          standalone.
        </p>
      </FadeIn>
      <FadeIn delay={0.06} className="mt-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text sm:text-sm"
              >
                {l.label}
                <ArrowRight className="h-3 w-3 -rotate-45" />
              </a>
            ) : (
              <Link
                key={l.label}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text sm:text-sm"
              >
                {l.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )
          )}
        </div>
      </FadeIn>
    </Section>
  );
}

function OpenSource() {
  return (
    <Section>
      <FadeIn>
        <div className="relative overflow-hidden rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-radial-fade opacity-60"
          />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <SectionEyebrow>Open source</SectionEyebrow>
              <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                The rail is MIT. The vault contracts open with the testnet
                deploy.
              </p>
            </div>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60 hover:bg-accent-indigo/10"
            >
              <Github className="h-4 w-4" />
              View on GitHub
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}

function Waitlist() {
  return (
    <Section id="waitlist" className="pb-32">
      <div className="mx-auto max-w-xl text-center">
        <FadeIn>
          <SectionEyebrow>Want the testnet deploy in your inbox?</SectionEyebrow>
          <SectionHeading className="mt-4">Leave an email</SectionHeading>
          <p className="mt-4 text-base text-text-muted">
            One note when the VaultFactory hits Robinhood Chain testnet, plus
            the occasional build-log digest. If you&apos;re already shipping
            on the rail, say what you&apos;re building — that&apos;s the
            message worth reading.
          </p>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-10 text-left">
          <WaitlistForm />
        </FadeIn>
      </div>
    </Section>
  );
}
