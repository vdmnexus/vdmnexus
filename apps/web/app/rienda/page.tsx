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
  title: "Rienda — agent treasuries on Robinhood Chain | VDM Nexus",
  description:
    "Smart-contract vaults for LLM trading agents. The vault holds the capital and enforces ten guardrails in contract code; the agent holds a session key that can trade but never withdraw. In development — testnet first.",
  alternates: { canonical: "https://vdmnexus.com/rienda" },
};

// Everything on this page describes contract-enforced behavior from the
// protocol spec. The spec repo is private until the testnet deploy —
// status lines only, no dates, no performance claims.

const GUARDRAILS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Max position size per asset",
    body: "No single asset can exceed a configured share of the vault. An intent that would push a position past its cap reverts — the trade never happens.",
  },
  {
    n: "02",
    title: "Max gross exposure",
    body: "Total exposure across all positions is capped. The agent can't concentrate the whole vault into open risk, however confident the model sounds.",
  },
  {
    n: "03",
    title: "Daily realized loss limit",
    body: "Once realized losses hit the day's limit, the vault accepts risk-reducing intents only until the daily window resets. A bad day stops being a worse one.",
  },
  {
    n: "04",
    title: "Drawdown throttles",
    body: "Drawdown past the first threshold halves permitted sizing. Past the second, the vault goes risk-reducing-only. Recovery has to be earned at reduced size.",
  },
  {
    n: "05",
    title: "Venue and asset whitelist",
    body: "The vault trades whitelisted assets on whitelisted venues, nothing else. An intent naming an unknown token or route reverts.",
  },
  {
    n: "06",
    title: "Order rate limit",
    body: "A hard cap on intents per time window. A model stuck in a loop — or manipulated into one — burns its rate budget, not the vault.",
  },
  {
    n: "07",
    title: "Oracle price sanity band",
    body: "Intents priced outside a band around the oracle price revert. Fat-fingered limits and manipulated quotes fail the same check.",
  },
  {
    n: "08",
    title: "Market-hours rule",
    body: "For tokenized equities: no position increases while the underlying market is closed. Risk-reducing intents still pass — you can always get smaller.",
  },
  {
    n: "09",
    title: "No leverage, structurally",
    body: "The vault cannot borrow. There is no margin, so there is no margin call, no liquidation cascade, no path to owing more than the vault holds.",
  },
  {
    n: "10",
    title: "Owner / guardian kill switch",
    body: "The vault owner — or a designated guardian — can halt trading and withdraw at any time. The agent sits below the kill switch and can never block an exit.",
  },
];

const STATUS_ITEMS: Array<{ label: string; state: string; live?: boolean }> = [
  { label: "Protocol spec", state: "complete" },
  {
    label: "Token + Uniswap v4 fee-burn hook contracts",
    state: "built — 26 passing tests",
  },
  { label: "Vault + policy engine (M1)", state: "in development" },
  { label: "Robinhood Chain testnet deploy", state: "next" },
  { label: "Mainnet", state: "gated behind external audit + legal review" },
];

export default function RiendaPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <SessionKey />
        <Guardrails />
        <ComputeBudget />
        <Layer1TieIn />
        <Status />
        <CTAs />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GridBg />
      <div className="mx-auto w-full max-w-4xl px-6 pb-16 pt-24 text-center sm:pb-20 sm:pt-32">
        <FadeIn>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SectionEyebrow>Rienda · Layer 2 — Capital</SectionEyebrow>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
              In development · testnet first
            </span>
          </div>
          <h1 className="mx-auto mt-8 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
            The vault holds the money.{" "}
            <span className="text-gradient">The model never does.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
            Rienda is a smart-contract vault for LLM trading agents on
            Robinhood Chain, an Ethereum L2. The vault holds the capital
            and enforces the risk policy in contract code. The agent holds
            a session key that can submit trade intents — and nothing
            else. Losses get bounded, not prevented.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function SessionKey() {
  return (
    <Section className="pt-0">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>The model is untrusted</SectionEyebrow>
        <SectionHeading className="mt-4">
          A session key that can trade. Never withdraw. Never change
          policy.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Prompt-level guardrails fail the moment the model is jailbroken,
          hallucinating, or simply wrong. Rienda assumes all three will
          happen and puts the guardrails where the model can&apos;t reach
          them: in the vault contract.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <FadeIn>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              The vault holds the capital
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Deposits sit in the vault contract, owned by the vault
              owner. The agent has no custody, no withdrawal path, and no
              way to grant itself one.
            </p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.06}>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              The agent holds a session key
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              The session key can do exactly one thing: submit trade
              intents to the vault. It cannot withdraw funds, cannot
              change policy parameters, cannot add itself as an owner.
            </p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.12}>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              The contract decides
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Every intent is checked against the ten guardrails below
              before execution. A compliant intent executes; a
              non-compliant one reverts. The model proposes, the contract
              disposes.
            </p>
          </Card>
        </FadeIn>
      </div>
    </Section>
  );
}

function Guardrails() {
  return (
    <Section id="guardrails">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Ten guardrails</SectionEyebrow>
        <SectionHeading className="mt-4">
          Contract code, not prompt engineering.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Each guardrail is a check the vault runs on every trade intent.
          They compose: an intent has to pass all ten to execute. None of
          them can be talked around, because none of them read the
          model&apos;s output — only its orders.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {GUARDRAILS.map((g, i) => (
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
    </Section>
  );
}

function ComputeBudget() {
  return (
    <Section id="compute-budget">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>The compute budget</SectionEyebrow>
        <SectionHeading className="mt-4">
          Agents that don&apos;t earn, don&apos;t think.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Inference costs money, so Rienda meters it against performance.
          Each day the agent gets an inference allowance: a survival
          minimum plus a share of the 7-day exponential moving average of
          its <span className="text-text">realized</span> PnL, hard-capped
          at the top. The allowance is spent via x402 — the same
          pay-per-call rail as Layer 1 — one signed receipt per call.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FadeIn>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              Realized PnL only
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Unrealized gains buy nothing. A position that looks good on
              paper doesn&apos;t fund a single inference call until it
              closes at a profit.
            </p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              Hard-capped upside
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              A hot streak raises the budget only to the cap. No amount of
              profit turns the agent into an unmetered spender.
            </p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              Hibernation
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Sustained losses shrink the allowance toward the survival
              minimum. In hibernation the agent may only submit
              risk-reducing intents — enough compute to get smaller, not
              to dig deeper.
            </p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.15}>
          <Card className="h-full">
            <h3 className="text-base font-semibold text-text">
              Auto wind-down
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              If losses persist through hibernation, the vault winds the
              agent down: positions close, capital returns to the owner.
              The strategy dies; the money doesn&apos;t.
            </p>
          </Card>
        </FadeIn>
      </div>
      <FadeIn className="mt-8">
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          The honest framing: this bounds losses, it does not prevent
          them. An agent can lose up to its configured limits before the
          throttles bite, and the design assumes most trading strategies
          lose money — that assumption is why the budget exists.
        </p>
      </FadeIn>
    </Section>
  );
}

function Layer1TieIn() {
  return (
    <Section id="receipts">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Built on Layer 1</SectionEyebrow>
        <SectionHeading className="mt-4">
          Every trade traces back to the reasoning that produced it.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Each inference call the agent pays for returns an Ed25519-signed
          SIR v2 receipt — prompt hash, response hash, model, cost. Each
          trade the vault executes links to the receipt of the inference
          that proposed it. The audit log isn&apos;t &quot;the agent
          traded&quot;; it&apos;s &quot;this exact model output, verifiable
          against this exact receipt, produced this exact trade.&quot;
          When a strategy gets reviewed — by its owner, or by anyone the
          owner shows it to — the chain of decisions is checkable
          end-to-end without trusting us.
        </p>
        <div className="mt-8">
          <Link
            href="/inference"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
          >
            How signed inference works
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </FadeIn>
    </Section>
  );
}

function Status() {
  return (
    <Section id="status">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Status</SectionEyebrow>
        <SectionHeading className="mt-4">Where it stands.</SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          No dates, no performance claims, no token promises beyond what
          the launch-gated token pages already state. What exists today:
        </p>
      </FadeIn>
      <FadeIn className="mt-8 max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
          {STATUS_ITEMS.map((item) => (
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
      <FadeIn className="mt-6 max-w-2xl">
        <p className="text-sm leading-relaxed text-text-muted">
          Nothing described on this page accepts deposits today. The
          contracts deploy to Robinhood Chain testnet (chain id 46630)
          before any mainnet deployment, and mainnet waits for both the
          audit and the legal review — however long that takes.
        </p>
      </FadeIn>
    </Section>
  );
}

function CTAs() {
  return (
    <Section className="pb-32 pt-0">
      <FadeIn>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/disclosures"
            className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            Read the disclosures
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {/*
            Spec-repo link goes here once the repo is public. The repo
            opens with the testnet deploy — Dennis decides when. Until
            then this stays a non-link so the page never points at a 404.
          */}
          <span className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-2.5 text-sm font-medium text-text-muted">
            Read the spec — repo opens with the testnet deploy
          </span>
        </div>
      </FadeIn>
    </Section>
  );
}
