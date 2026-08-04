import type { Metadata } from "next";
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
import { FadeIn } from "@/components/fade-in";
import { BuildForm } from "@/components/build-form";

/**
 * `/build` — the URL a "want to help build this?" post points at, so the
 * answer stops being "reply to this tweet".
 *
 * Hard constraints on the copy here, because this page asks people for their
 * time: no compensation, equity, token, or airdrop language, and nothing that
 * reads as employment. It is collaboration on an unfunded pre-revenue project
 * and the page says so in the second section rather than burying it. Status
 * claims match /rienda and the homepage — in development, testnet first,
 * mainnet gated behind an external audit and a legal review.
 */

export const metadata: Metadata = {
  title: "Build with us — VDM Nexus",
  description:
    "Rienda is a self-custodial vault for LLM trading agents on Robinhood Chain — guardrails in contract code, a signed inference receipt behind every decision. In development, testnet first, mainnet gated behind an external audit and legal review. Where outside help lands: Solidity and Foundry, TypeScript, strategy and quant work, security review. Early, pre-revenue, no funded headcount — collaboration, not a job posting.",
  alternates: { canonical: "https://vdmnexus.com/build" },
  openGraph: {
    title: "Build with us — VDM Nexus",
    description:
      "Rienda is in development — testnet first. Four places outside help lands: Solidity and Foundry, TypeScript, strategy and quant, security review. Early and pre-revenue, no funded headcount.",
    url: "https://vdmnexus.com/build",
    siteName: "VDM Nexus",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "VDM Nexus — The model never holds the keys",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Build with us — VDM Nexus",
    description:
      "Rienda is in development. Solidity and Foundry, TypeScript, strategy and quant, security review. Early and pre-revenue — collaboration, not a job posting.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

const GITHUB_URL = "https://github.com/vdmnexus/vdmnexus";
const TELEGRAM_URL = "https://t.me/vdmnexus";
const X_URL = "https://x.com/vdmnexus";

const AREAS: Array<{ label: string; title: string; body: string }> = [
  {
    label: "Solidity · Foundry",
    title: "The vault and the policy engine",
    body: "M1 is the vault contract plus the policy engine that runs ten guardrail checks on every trade intent — position caps, a daily realized-loss limit, drawdown throttles, an oracle price band. Separately there is Uniswap v4 hook work behind the fee-burn pool. Foundry tests are the currency: a failing test showing a guardrail can be walked around is worth more here than a new feature.",
  },
  {
    label: "TypeScript",
    title: "Agent host, model router, x402",
    body: "The agent is the untrusted party by design, so the interesting work sits at its boundary — session-key handling, intent construction, what happens on a revert, how a retry avoids becoming a second order. The model router and the x402 payment path are both live code you can read today: eight MIT packages on npm and PyPI.",
  },
  {
    label: "Strategy · quant",
    title: "Backtesting and execution quality",
    body: "The compute budget meters an agent's inference allowance against its realized PnL, which only means anything if the PnL is measured honestly — slippage, fees, fill assumptions, survivorship. The design already assumes most strategies lose money. Finding out exactly how, in a backtest, before any capital moves, is the useful contribution.",
  },
  {
    label: "Security",
    title: "Try to break it",
    body: "No third-party audit is scheduled. The vault contracts are private until the testnet deploy, so today this means the published rail: receipt signing, the five-check verifier, the paywall middleware, the facilitator path. When the contract repo opens, guardrail bypasses and session-key escalation are the first things worth attacking. Reports go to security@vdmnexus.com.",
  },
];

export default function BuildPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <WhatWereBuilding />
        <Terms />
        <Areas />
        <SignUp />
        <Elsewhere />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GridBg />
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-24 sm:pb-20 sm:pt-32">
        <FadeIn>
          <div className="flex flex-wrap items-center gap-3">
            <SectionEyebrow>Build with us</SectionEyebrow>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
              Early · pre-revenue · no headcount
            </span>
          </div>
          <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
            Open problems, and a{" "}
            <span className="text-gradient">repo to put them in</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-text-muted sm:text-xl">
            If you want to help build this, leave an email and a line about
            what you&apos;d pick up. That&apos;s the whole ask. What follows
            is what&apos;s being built, what help actually moves it, and what
            this is not.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function WhatWereBuilding() {
  return (
    <Section className="pt-0">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>What&apos;s being built</SectionEyebrow>
        <SectionHeading className="mt-4">
          A vault the agent can trade from and never drain.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Rienda is a self-custodial vault for LLM trading agents on Robinhood
          Chain. The vault holds the capital and enforces ten guardrails in
          contract code; the agent holds a session key that submits trade
          intents and can do nothing else — no withdrawals, no policy changes,
          no path to granting itself either. Every trade links back to the
          Ed25519-signed receipt of the inference that proposed it, so the
          decision history is checkable by someone who doesn&apos;t trust us.
        </p>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Status, plainly: in development. The contracts deploy to Robinhood
          Chain testnet (chain id 46630) before anything else, and mainnet
          waits on an external audit and a legal review — however long those
          take. Nothing accepts deposits today and nothing has traded, so
          there is no track record to show you. The signed-inference rail
          underneath has been on Solana and Base mainnet since 2026-05-21;
          that part is real and has callers.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/rienda"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
          >
            The ten guardrails, in full
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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

// The section that has to be unambiguous. If a reader takes away anything
// other than "unpaid collaboration on an early project", this copy is wrong.
function Terms() {
  return (
    <Section className="pt-0">
      <FadeIn>
        <div className="max-w-3xl rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            What this is not
          </div>
          <p className="mt-4 text-base leading-relaxed text-text">
            This is not a job posting. VDM Nexus is early and pre-revenue,
            there is no funded headcount, and no compensation, equity, tokens,
            or airdrop is on offer — contributing does not earn any of them and
            nothing on this page should be read as implying otherwise. Nobody
            is being hired, contracted, or promised future consideration.
          </p>
          <p className="mt-4 text-base leading-relaxed text-text-muted">
            What there is: unsolved problems that are written down, code review
            on what you send, and a commit history with your name in it. The
            published packages are MIT and stay that way. If the funding
            situation ever changes, that gets written down publicly before
            anyone is asked to act on it.
          </p>
        </div>
      </FadeIn>
    </Section>
  );
}

function Areas() {
  return (
    <Section className="pt-0">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Where help lands</SectionEyebrow>
        <SectionHeading className="mt-4">Four places, specifically.</SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Not a list of every role a company might one day have. These are the
          four where an outside contribution changes what ships next. If your
          thing isn&apos;t here and you still think it matters, say so in the
          box below — a good argument beats a category.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {AREAS.map((area, i) => (
          <FadeIn key={area.title} delay={Math.min(i, 3) * 0.05}>
            <Card className="h-full">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
                {area.label}
              </span>
              <h3 className="mt-3 text-base font-semibold text-text">
                {area.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {area.body}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

function SignUp() {
  return (
    <Section id="sign-up" className="pt-0">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <SectionEyebrow>Sign up</SectionEyebrow>
          <SectionHeading className="mt-4">
            Email, and one line.
          </SectionHeading>
          <p className="mt-4 text-base leading-relaxed text-text-muted">
            The line is the part worth writing. A repo, a handle, or the
            specific piece you&apos;d take — that&apos;s what makes a reply
            possible instead of a thank-you note.
          </p>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-10">
          <BuildForm />
        </FadeIn>
      </div>
    </Section>
  );
}

function Elsewhere() {
  return (
    <Section className="pb-32 pt-0">
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Or skip the form</SectionEyebrow>
        <SectionHeading className="mt-4">
          The code and the chat are both open.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          An issue or a pull request is a fine first message. So is a question
          in the Telegram.
        </p>
      </FadeIn>
      <FadeIn className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
          >
            <Github className="h-4 w-4" />
            github.com/vdmnexus
            <ArrowRight className="h-3.5 w-3.5 -rotate-45" />
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
          >
            Telegram
            <ArrowRight className="h-3.5 w-3.5 -rotate-45" />
          </a>
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
          >
            @vdmnexus
            <ArrowRight className="h-3.5 w-3.5 -rotate-45" />
          </a>
        </div>
      </FadeIn>
    </Section>
  );
}
