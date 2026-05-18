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
import { Card, ComingSoonBadge } from "@/components/card";
import { WaitlistForm } from "@/components/waitlist-form";
import { FadeIn } from "@/components/fade-in";
import { WaitlistProvider } from "@/components/waitlist-context";

const GITHUB_URL = "https://github.com/2504VDM/vdmnexus";

const PROBLEMS = [
  {
    title: "Fragmented providers",
    body:
      "Dozens of GPU and inference providers, each with different pricing, APIs, and reliability. No single source of truth.",
  },
  {
    title: "Agents can't pay for infra",
    body:
      "Autonomous on-chain agents have wallets but can't access compute. The bridge between crypto and inference doesn't exist yet.",
  },
  {
    title: "Unpredictable costs",
    body:
      "AI businesses overpay because they can't see, route, or control compute spend in real-time.",
  },
];

const STEPS = [
  {
    title: "Connect",
    body: "Point your workload or agent at a single Nexus API endpoint.",
  },
  {
    title: "Route",
    body: "We normalize pricing across providers and route to the best option in real-time.",
  },
  {
    title: "Control",
    body: "Track spend, set budgets, and let agents operate autonomously within defined limits.",
  },
];

const FOR_BUSINESSES = [
  "Route smarter",
  "Reduce compute costs",
  "Full spend visibility",
];

const FOR_BUILDERS = [
  "Crypto-native compute payments",
  "Agent-to-agent compute markets",
  "No human in the loop",
];

export default function Home() {
  return (
    <WaitlistProvider>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Products />
        <HowItWorks />
        <Audiences />
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
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-24 sm:pb-32 sm:pt-32">
        <FadeIn>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* Copy + CTAs */}
            <div className="text-center lg:text-left">
              <SectionEyebrow>Infrastructure for autonomous AI</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                AI agents that{" "}
                <span className="text-gradient">pay for their own compute</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-balance text-base text-text-muted sm:text-lg lg:mx-0">
                No API keys. No human in the loop. Every request is signed by
                an Ed25519 keypair and settled in USDC on Solana.
              </p>
              <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-3 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-soft bg-surface/60 px-5 py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
                >
                  Join the waitlist
                </a>
              </div>
            </div>

            {/* Code block */}
            <div className="lg:pl-4">
              <HeroCode />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function HeroCode() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-soft bg-bg/80 shadow-[0_0_60px_-12px_rgba(99,102,241,0.35)] backdrop-blur">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-soft px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a4a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a4a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a4a]" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
          agent.ts
        </span>
        <span className="w-12" />
      </div>

      <pre className="overflow-x-auto px-4 py-5 font-mono text-[13px] leading-relaxed">
        <code className="text-text">
          <span className="text-text-muted">{`// Spawn a Solana-keypair agent`}</span>{"\n"}
          <span className="text-violet-300">import</span>{" "}
          <span className="text-text">{`{ Agent }`}</span>{" "}
          <span className="text-violet-300">from</span>{" "}
          <span className="text-emerald-300">{`"@vdm-nexus/sdk"`}</span>;
          {"\n\n"}
          <span className="text-violet-300">const</span>{" "}
          <span className="text-sky-300">agent</span>{" "}
          <span className="text-violet-300">=</span>{" "}
          <span className="text-sky-300">Agent</span>.
          <span className="text-yellow-200">generate</span>();
          {"\n\n"}
          <span className="text-violet-300">const</span>{" "}
          <span className="text-sky-300">reply</span>{" "}
          <span className="text-violet-300">=</span>{" "}
          <span className="text-violet-300">await</span>{" "}
          <span className="text-sky-300">agent</span>.
          <span className="text-yellow-200">inference</span>({"\n"}
          {"  "}
          <span className="text-emerald-300">
            {`"https://nexus.vdmnexus.com/api/v1"`}
          </span>,{"\n"}
          {"  "}{"{"}{" "}
          <span className="text-sky-300">prompt</span>:{" "}
          <span className="text-emerald-300">{`"Why Ed25519?"`}</span>,{" "}
          <span className="text-sky-300">task_type</span>:{" "}
          <span className="text-emerald-300">{`"fast"`}</span>{" "}{"}"}{"\n"}
          );
          {"\n\n"}
          <span className="text-text-muted">{`// reply.receipt.cost_usdc → $0.0005`}</span>{"\n"}
          <span className="text-text-muted">{`// reply.receipt.balance_remaining → $0.9995`}</span>
        </code>
      </pre>

      <div className="flex items-center justify-between border-t border-soft bg-surface/40 px-4 py-2.5 text-[11px]">
        <code className="font-mono text-text-muted">
          npm install @vdm-nexus/sdk
        </code>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
          devnet
        </span>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>The problem</SectionEyebrow>
        <SectionHeading className="mt-4">
          Compute shouldn&apos;t be this hard
        </SectionHeading>
      </FadeIn>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROBLEMS.map((p, i) => (
          <FadeIn key={p.title} delay={i * 0.08}>
            <Card className="h-full">
              <h3 className="text-base font-semibold text-text">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {p.body}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

function Products() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Products</SectionEyebrow>
        <SectionHeading className="mt-4">
          Two layers. One platform.
        </SectionHeading>
      </FadeIn>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <FadeIn>
          <Link href="/compute" className="block h-full">
            <Card className="group h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-accent-indigo">
                  Active
                </span>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text">
                Nexus Compute
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Smart compute routing for AI businesses. Routes workloads to
                the cheapest or best provider in real-time. Accepts crypto
                payments for on-chain agents.
              </p>
            </Card>
          </Link>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Link href="/agents" className="block h-full">
            <Card className="group h-full">
              <div className="flex items-center justify-between">
                <ComingSoonBadge />
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text">
                Nexus Agents
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Infrastructure for autonomous on-chain AI agents that acquire
                and spend compute independently.
              </p>
            </Card>
          </Link>
        </FadeIn>
      </div>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>How it works</SectionEyebrow>
        <SectionHeading className="mt-4">
          One endpoint. Full control.
        </SectionHeading>
      </FadeIn>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <FadeIn key={s.title} delay={i * 0.08}>
            <Card className="h-full">
              <span className="font-mono text-xs text-accent-indigo">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-base font-semibold text-text">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {s.body}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

function Audiences() {
  return (
    <Section>
      <div className="grid gap-4 md:grid-cols-2">
        <FadeIn>
          <Card className="h-full">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              For AI businesses
            </span>
            <h3 className="mt-4 text-xl font-semibold text-text">
              Cut your inference bill. Take back control.
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              {FOR_BUSINESSES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-indigo" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card className="h-full">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              For agent builders
            </span>
            <h3 className="mt-4 text-xl font-semibold text-text">
              Compute as the currency of autonomous AI.
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              {FOR_BUILDERS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-blue" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>
      </div>
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
                The SDK is open. The infrastructure is yours to control.
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
          <SectionEyebrow>Early access</SectionEyebrow>
          <SectionHeading className="mt-4">Join the waitlist</SectionHeading>
          <p className="mt-4 text-base text-text-muted">
            We&apos;re onboarding AI businesses and agent builders. Tell us
            what you&apos;re building.
          </p>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-10 text-left">
          <WaitlistForm />
        </FadeIn>
      </div>
    </Section>
  );
}
