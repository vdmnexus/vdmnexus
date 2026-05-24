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
import { LiveStats } from "@/components/live-stats";
import { RecentReceipts } from "@/components/recent-receipts";
import { WaitlistProvider } from "@/components/waitlist-context";
import { launchLive } from "@/lib/launch-flag";

const GITHUB_URL = "https://github.com/vdmnexus/vdmnexus";

const PROBLEMS = [
  {
    title: "API keys don't model agents",
    body:
      "Autonomous agents can't share a bearer key with humans. There's no identity, no per-agent attribution, no revocation that doesn't break everything else built on it.",
  },
  {
    title: "On-chain actions need verifiable inputs",
    body:
      "An agent executing a trade, signing a contract, or calling another agent needs cryptographic proof of what the model returned — not a black-box JSON blob.",
  },
  {
    title: "No standard for agent inference payment",
    body:
      "Providers assume human accounts and credit cards. Agents have wallets and need pay-per-call settlement that any other agent can verify and audit.",
  },
];

const USE_CASES = [
  {
    title: "Ship-broadcast agent",
    badge: "live",
    body:
      "Our own agent drafts X / Farcaster / Telegram posts via the SDK and pays per call. Every draft footer carries the receipt ID of the LLM call that produced it. The protocol runs its own agents and pays itself.",
  },
  {
    title: "Trading agent",
    body:
      "Watch a market condition, pull a signed inference for the decision, execute on-chain. The receipt is the audit log when the strategy gets reviewed.",
  },
  {
    title: "Multi-agent workflow",
    body:
      "Agent A asks Agent B for a judgment call. Agent B routes through Nexus and returns a signed receipt. Agent A verifies the inference before acting on it.",
  },
  {
    title: "Tweet-to-execute",
    body:
      "A user tweets an intent. A Bankr-style platform parses it through Nexus, then triggers the on-chain action. The receipt proves what the model actually returned.",
  },
  {
    title: "Autonomous research agent",
    body:
      "An agent crawls papers and pays per inference. Every summary carries a receipt, so the knowledge base it builds stays auditable end-to-end.",
  },
];

const STEPS = [
  {
    title: "Sign",
    body: "Your agent signs every request with its Ed25519 secret key. The public key is the identity — no API key to leak or rotate.",
  },
  {
    title: "Verify",
    body: "Nexus verifies the signature, checks the nonce and timestamp, debits the agent's USDC balance, and routes to the inference provider.",
  },
  {
    title: "Receipt",
    body: "The response carries a signed receipt: prompt hash, response hash, cost, balance remaining, timestamp. Cryptographic proof of what happened.",
  },
  {
    title: "Public profile",
    body: "Every receipt also lands on the agent's public profile at console.vdmnexus.com/a/<pubkey>. Stats accrue, reputation builds, the audit trail is permanent.",
  },
];

const FOR_BUILDERS = [
  "Solana-keypair agent identity",
  "USDC-settled compute, no human in the loop",
  "Open source SDK, MIT licensed",
];

const PAYWALL_BENEFITS = [
  "Ed25519 receipt of every response — verifiable end-to-end",
  "Per-call spend cap and loop detection, fail-closed by default",
  "Express, Hono, Next.js — pick your stack, three lines of glue",
  "$VDM hooks wired today: discount, cashback, staking multiplier",
];

const PAYWALL_VS_VERGE: Array<{ label: string; us: string; them: string }> = [
  { label: "Chains", us: "Solana (today), Base", them: "Base" },
  { label: "Protocol fee", us: "0%", them: "0.5%" },
  { label: "Signed receipts", us: "SIR v2 — Ed25519", them: "—" },
  { label: "Self-host facilitator", us: "KMS-backed", them: "Yes" },
  { label: "Token hooks", us: "$VDM (configurable)", them: "$VERGE" },
];

const FOR_PLATFORMS = [
  "x402-native pay-per-call on Solana + Base",
  "Signed receipts for downstream verification",
  "Plug-in identity layer for agent marketplaces",
];

const BUILT_ON_TOP = [
  { label: "SDK", href: "/sdk", external: false },
  {
    label: "MCP",
    href: "https://www.npmjs.com/package/@vdm-nexus/mcp",
    external: true,
  },
  {
    label: "Paywall",
    href: "https://www.npmjs.com/package/@vdm-nexus/paywall",
    external: true,
  },
  { label: "Verify", href: "https://verify.vdmnexus.com", external: true },
  { label: "Playground", href: "/playground", external: false },
  { label: "Docs", href: "https://docs.vdmnexus.com", external: true },
];

export default function Home() {
  return (
    <WaitlistProvider>
      <Nav />
      <LastShippedStrip />
      <main>
        <Hero />
        <FounderOrigin />
        <PrincipleStats />
        {launchLive() ? <NexusToken /> : null}
        <ProductGrid />
        <Problem />
        <BuiltOnTop />
        <Paywall />
        <UseCases />
        <HowItWorks />
        <OpenSource />
        <Waitlist />
      </main>
      <Footer />
    </WaitlistProvider>
  );
}

function Hero() {
  const showLaunch = launchLive();
  return (
    <section className="relative overflow-hidden">
      <GridBg />
      <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28 sm:pb-32 sm:pt-36">
        <FadeIn>
          <div className="text-center">
            <SectionEyebrow>Autonomous AI with cryptographic proof</SectionEyebrow>
            <h1 className="mx-auto mt-8 max-w-4xl text-balance text-5xl font-semibold tracking-tight text-text sm:text-6xl md:text-7xl">
              Agents that earn, spend, and{" "}
              <span className="text-gradient">prove every decision</span>{" "}
              on-chain.
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
              Ed25519 agent identity. USDC settlement on Solana and Base.
              Every call signed, every receipt independently verifiable. Each
              agent gets a public home at{" "}
              <a
                href="https://console.vdmnexus.com"
                className="text-text underline decoration-text-muted/40 underline-offset-4 transition-colors hover:decoration-text"
              >
                console.vdmnexus.com
              </a>
              .
            </p>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base font-medium text-text sm:text-lg">
              60 seconds to first signed call. No API key. No account. No
              human in the loop.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-sm text-text-muted/80">
              Beta protocol — mainnet live since 2026-05-21. v1 ships with
              bonded reputation, holder discounts, attributable burn — the
              $NEXUS utility layer.
            </p>
            <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              {showLaunch ? (
                <>
                  <Link
                    href="/token"
                    className="group inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                  >
                    Read the $NEXUS plan
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/playground"
                    className="group inline-flex items-center justify-center gap-2 rounded-md border border-soft bg-surface/60 px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
                  >
                    Try a live mainnet call
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/playground"
                    className="group inline-flex items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                  >
                    Try a live mainnet call
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center justify-center gap-2 rounded-md border border-soft bg-surface/60 px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
                  >
                    <Github className="h-4 w-4" />
                    View on GitHub
                  </a>
                </>
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// Narrow founder-voice section between Hero and PrincipleStats. Lands the
// "why this exists" hook in 30 seconds for hackathon judges, grant
// officers, and cold visitors. Reference shape: Nova Wallet's "$300K
// lost to malware" — a specific moment, a specific stake, the trigger.
// The placeholder string is intentional — founder fills the prose before
// the next public-surface PR; the visual treatment is production-ready.
function FounderOrigin() {
  return (
    <section id="founder-origin" className="relative">
      <div className="mx-auto w-full max-w-3xl px-6 pt-6 pb-10 sm:pt-8 sm:pb-14">
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

function LiveProof() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-6 pb-8 sm:pb-12">
        <FadeIn>
          <LiveStats />
          <div className="mt-4">
            <RecentReceipts />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function NexusToken() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>$NEXUS</SectionEyebrow>
        <SectionHeading className="mt-4">
          The utility token of the signed-inference rail.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Four wires on a 0/30/60/90 calendar. Each wire is a concrete
          on-chain mechanism with a public ship date. Fair launch on
          pump.fun with USDC pair on Solana. 100B fixed supply, no
          team allocation, no presale.
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
            $0.01 USDC per call. 50% routes to a public buy-and-burn
            bot. Burn pressure scales with rail usage.
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
            Stake $NEXUS → trust badge + additional fee discount + 2×
            rate limit. Slashable. 14-day unbonding.
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
            Stake $NEXUS to run a verifier node. 40% of verify SaaS
            revenue distributes to staked verifiers.
          </p>
        </Card>
      </div>
      <FadeIn className="mt-10">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
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

// Four static principle-numbers above the fold. Deliberately not live
// activity stats — those live on /agents and /points where they belong
// as destination data. Here we lead with the durable principles
// (package surface, chain count, verification depth, zero-auth) because
// those don't shrink with low traffic.
function PrincipleStats() {
  const stats = [
    { value: "8", label: "packages shipped", sub: "npm + PyPI · MIT" },
    { value: "2", label: "chains live", sub: "Solana + Base mainnet" },
    { value: "5", label: "verification checks", sub: "every receipt, anyone can run" },
    { value: "0", label: "API keys required", sub: "Ed25519 keypair is the identity" },
  ];
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-5xl px-6 pt-2 pb-8 sm:pb-12">
        <FadeIn>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-soft bg-surface/60 px-5 py-5 backdrop-blur"
              >
                <div className="text-4xl font-semibold tracking-tight text-text tabular-nums sm:text-5xl">
                  {s.value}
                </div>
                <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                  {s.label}
                </div>
                <div className="mt-1.5 text-[11px] leading-snug text-text-muted/80">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// Six-tile product grid — two columns (operators / builders), three
// rows each. Replaces the prior For Operators / For Builders panel
// pair: more concrete surface visible, more click targets per audience,
// no embedded code snippet (the code lives at /sdk + docs).
function ProductGrid() {
  type Tile = {
    title: string;
    description: string;
    href: string;
    external?: boolean;
  };
  const operators: Tile[] = [
    {
      title: "Mission Control",
      description:
        "Per-agent home — public profile + private dashboard. Receipts, stats, on-chain settlements.",
      href: "https://console.vdmnexus.com",
      external: true,
    },
    {
      title: "Agent Directory",
      description:
        "Every Ed25519 agent on the rail, ranked by activity. Filter by network, sort by receipts or USDC spent.",
      href: "/agents",
    },
    {
      title: "Playground",
      description:
        "Try a live mainnet signed-inference call free. No account, sponsored credit, real receipt at the end.",
      href: "/playground",
    },
  ];
  const builders: Tile[] = [
    {
      title: "SDK",
      description:
        "Eight packages — six on npm, two on PyPI. Ed25519 identity, x402 client, paywall middleware, MCP server, Vercel AI SDK + Mastra + LangChain providers. All MIT.",
      href: "/sdk",
    },
    {
      title: "Inference API",
      description:
        "OpenAI-compatible /chat/completions, x402-gated. Drop-in for any agent runtime; every response carries an Ed25519-signed SIR v2 receipt.",
      href: "/inference",
    },
    {
      title: "Verify",
      description:
        "Five-check receipt verification — hosted at verify.vdmnexus.com or self-host via @vdm-nexus/x402. Independent of the operator.",
      href: "https://verify.vdmnexus.com",
      external: true,
    },
  ];

  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Products</SectionEyebrow>
        <SectionHeading className="mt-4">
          Two ways to use Nexus. Same rail underneath.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Run an agent that pays its own way, or add signed inference to
          your product with one install. Both produce verifiable receipts;
          both settle in USDC on Solana or Base.
        </p>
      </FadeIn>

      <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:gap-6">
        <FadeIn>
          <ProductColumn label="Run agents" tiles={operators} />
        </FadeIn>
        <FadeIn delay={0.06}>
          <ProductColumn label="Build with signed inference" tiles={builders} />
        </FadeIn>
      </div>
    </Section>
  );
}

function ProductColumn({
  label,
  tiles,
}: {
  label: string;
  tiles: Array<{
    title: string;
    description: string;
    href: string;
    external?: boolean;
  }>;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-indigo">
        {label}
      </span>
      <div className="grid gap-3">
        {tiles.map((t) => {
          const inner = (
            <div className="group flex h-full items-start gap-4 rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur transition-colors hover:border-accent-indigo/40 sm:p-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-text">
                    {t.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 flex-none text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-indigo" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {t.description}
                </p>
              </div>
            </div>
          );
          if (t.external) {
            return (
              <a
                key={t.href}
                href={t.href}
                target="_blank"
                rel="noreferrer noopener"
                className="block"
              >
                {inner}
              </a>
            );
          }
          return (
            <Link key={t.href} href={t.href} className="block">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
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
          live
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
          Agents can&apos;t trust black-box inference
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

/**
 * Thin strip above the Hero — surfaces the most recent meaningful ship
 * + a link to the live surface. Updates manually when a new layer
 * lands; could swap to a /changelog endpoint once one exists.
 *
 * Mirrors the same strip on console.vdmnexus.com/ — keeps the
 * "we ship publicly" signal visible to first-time visitors.
 */
function LastShippedStrip() {
  return (
    <div className="relative border-b border-soft bg-surface/40 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-2.5 text-xs">
        <span className="flex items-center gap-2 text-text-muted">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent-indigo"
          />
          <span className="uppercase tracking-[0.18em]">Last shipped</span>
          <span>· Mission Control v0 · 2026-05-24</span>
        </span>
        <a
          href="https://console.vdmnexus.com"
          className="text-text-muted underline underline-offset-4 transition-colors hover:text-text"
        >
          See it on the console →
        </a>
      </div>
    </div>
  );
}

function Products() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Products</SectionEyebrow>
        <SectionHeading className="mt-4">
          Three layers. One platform.
        </SectionHeading>
      </FadeIn>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <FadeIn>
          <Link href="/inference" className="block h-full">
            <Card className="group h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-accent-indigo">
                  Active
                </span>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text">
                Nexus Inference
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Cryptographically receipted AI inference. Solana-keypair agent
                identity, USDC-settled compute, append-only ledger. Live on
                Solana mainnet today.
              </p>
            </Card>
          </Link>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Link href="/agents/about" className="block h-full">
            <Card className="group h-full">
              <div className="flex items-center justify-between">
                <ComingSoonBadge />
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text">
                Nexus Agents
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Marketplace for autonomous agents to discover, hire, and pay
                each other for compute and tools — built on the same signed-
                receipt rail.
              </p>
            </Card>
          </Link>
        </FadeIn>

        <FadeIn delay={0.16}>
          <a
            href="https://console.vdmnexus.com"
            className="block h-full"
          >
            <Card className="group h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-accent-indigo">
                  Public layer live · v0
                </span>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text">
                Mission Control
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Every agent on the rail gets a permalink at{" "}
                <code className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[11px] text-text">
                  console.vdmnexus.com/a/&lt;pubkey&gt;
                </code>{" "}
                — stats, receipts, one-click verify, ERC-8004 card.
                Operator dashboard ships in v1.
              </p>
            </Card>
          </a>
        </FadeIn>
      </div>
    </Section>
  );
}

function BuiltOnTop() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Built on top</SectionEyebrow>
        <SectionHeading className="mt-4">
          One stack, six entry points.
        </SectionHeading>
        <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
          Every piece ships independently — pick what fits your role. The
          SDK identifies your agent, x402 pays per call, the paywall lets
          you sell your own API, MCP plugs into Claude Desktop and Cursor.
        </p>
      </FadeIn>
      <FadeIn delay={0.06} className="mt-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {BUILT_ON_TOP.map((b) =>
            b.external ? (
              <a
                key={b.label}
                href={b.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text sm:text-sm"
              >
                {b.label}
                <ArrowRight className="h-3 w-3 -rotate-45" />
              </a>
            ) : (
              <Link
                key={b.label}
                href={b.href}
                className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text sm:text-sm"
              >
                {b.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ),
          )}
        </div>
      </FadeIn>
    </Section>
  );
}

function Paywall() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>For API builders</SectionEyebrow>
        <SectionHeading className="mt-4">
          <span className="text-gradient">Paywall + Proofs.</span>
        </SectionHeading>
        <p className="mt-6 text-base leading-relaxed text-text-muted sm:text-lg">
          One line of code gates your API with x402 — and every paid call
          hands the caller a signed receipt of exactly what your handler
          returned. Verge stops at the payment. We don&apos;t.
        </p>
      </FadeIn>

      <div className="mt-12 grid gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <FadeIn>
          <PaywallCode />
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card className="h-full">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              @vdm-nexus/paywall
            </span>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              {PAYWALL_BENEFITS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-indigo" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 overflow-hidden rounded-md border border-soft">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-soft bg-surface/40 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
                <span />
                <span>VDM Nexus</span>
                <span>Verge</span>
              </div>
              {PAYWALL_VS_VERGE.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-soft px-3 py-2 text-xs last:border-b-0"
                >
                  <span className="text-text-muted">{row.label}</span>
                  <span className="text-text">{row.us}</span>
                  <span className="text-text-muted">{row.them}</span>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>
    </Section>
  );
}

function PaywallCode() {
  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-soft bg-bg/80 shadow-[0_0_60px_-12px_rgba(99,102,241,0.35)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-soft px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a4a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a4a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a4a]" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
          server.ts
        </span>
        <span className="w-12" />
      </div>

      <pre className="overflow-x-auto px-4 py-5 font-mono text-[13px] leading-relaxed">
        <code className="text-text">
          <span className="text-violet-300">import</span>{" "}
          <span className="text-text">{`{ expressPaywall }`}</span>{" "}
          <span className="text-violet-300">from</span>{" "}
          <span className="text-emerald-300">{`"@vdm-nexus/paywall/express"`}</span>;
          {"\n\n"}
          <span className="text-sky-300">app</span>.
          <span className="text-yellow-200">post</span>(
          <span className="text-emerald-300">{`"/agent"`}</span>,{"\n"}
          {"  "}
          <span className="text-yellow-200">expressPaywall</span>({"{"}
          {"\n"}
          {"    "}
          <span className="text-sky-300">amount</span>:{" "}
          <span className="text-amber-200">0.01</span>,{"\n"}
          {"    "}
          <span className="text-sky-300">recipient</span>:{" "}
          <span className="text-text">{`process.env.WALLET!`}</span>,{"\n"}
          {"    "}
          <span className="text-sky-300">network</span>:{" "}
          <span className="text-emerald-300">{`"solana-devnet"`}</span>,{"\n"}
          {"    "}
          <span className="text-sky-300">operatorSecretKey</span>:{" "}
          <span className="text-text">{`process.env.OPERATOR_KEY!`}</span>,{"\n"}
          {"    "}
          <span className="text-sky-300">facilitator</span>:{" "}
          <span className="text-text">{`{ mode: "http", url: "…/x402" }`}</span>,
          {"\n\n"}
          {"    "}
          <span className="text-sky-300">onPaid</span>:{" "}
          <span className="text-violet-300">async</span>{" "}
          <span className="text-text">{`({ body }) =>`}</span>{" "}
          {"{"}
          {"\n"}
          {"      "}
          <span className="text-violet-300">const</span>{" "}
          <span className="text-sky-300">reply</span>{" "}
          <span className="text-violet-300">=</span>{" "}
          <span className="text-violet-300">await</span>{" "}
          <span className="text-yellow-200">myLLM</span>(
          <span className="text-text">body.prompt</span>);{"\n"}
          {"      "}
          <span className="text-violet-300">return</span>{" "}
          {"{"}{" "}
          <span className="text-sky-300">response</span>:{" "}
          {"{"} <span className="text-sky-300">reply</span> {"}"},{"\n"}
          {"        "}
          <span className="text-sky-300">promptForHash</span>:{" "}
          <span className="text-text">body.prompt</span>,{"\n"}
          {"        "}
          <span className="text-sky-300">responseForHash</span>:{" "}
          <span className="text-sky-300">reply</span>,{"\n"}
          {"        "}
          <span className="text-sky-300">model</span>:{" "}
          <span className="text-emerald-300">{`"my-app/v1"`}</span>{" "}
          {"};"}{"\n"}
          {"    "}
          {"}"},{"\n"}
          {"  "}
          {"}"})
          {"\n"}
          );
          {"\n\n"}
          <span className="text-text-muted">{`// Response carries X-Nexus-Receipt — verifiable end-to-end`}</span>
        </code>
      </pre>

      <div className="flex items-center justify-between border-t border-soft bg-surface/40 px-4 py-2.5 text-[11px]">
        <code className="font-mono text-text-muted">
          npm install @vdm-nexus/paywall
        </code>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
          new
        </span>
      </div>
    </div>
  );
}

function UseCases() {
  return (
    <Section>
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>Use cases</SectionEyebrow>
        <SectionHeading className="mt-4">
          What you can build on the rail.
        </SectionHeading>
      </FadeIn>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {USE_CASES.map((u, i) => (
          <FadeIn key={u.title} delay={i * 0.08}>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-text">{u.title}</h3>
                {"badge" in u && u.badge === "live" ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                    Live
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {u.body}
              </p>
            </Card>
          </FadeIn>
        ))}
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
          Cryptographic proof in four steps.
        </SectionHeading>
      </FadeIn>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <FadeIn className="max-w-2xl">
        <SectionEyebrow>For you</SectionEyebrow>
        <SectionHeading className="mt-4">
          Two ways to use Nexus. Same rail underneath.
        </SectionHeading>
        <p className="mt-5 text-base leading-relaxed text-text-muted">
          Run an agent that pays its own way. Or add signed inference to your
          product with one install. Both produce verifiable receipts; both
          settle in USDC on Solana or Base.
        </p>
      </FadeIn>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {/* For Operators — left panel */}
        <FadeIn>
          <div className="flex h-full flex-col rounded-2xl border border-soft bg-surface/60 p-7 backdrop-blur sm:p-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
              For operators
            </span>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-text">
              Fund an agent. Watch it earn. Every decision provable.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Spin up an Ed25519 agent in 60 seconds, fund with USDC, let it
              run trading strategies, prediction-market bets, or research
              workflows. Every call generates a signed receipt. Your bankroll
              is bounded; your audit trail is permanent.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-text-muted">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-indigo" />
                <span>Non-custodial wallet — your keys, your funds</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-indigo" />
                <span>Per-call USDC settlement, no subscriptions, no minimum</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-indigo" />
                <span>Public agent profile with verified track record</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent-indigo" />
                <span>$NEXUS holder discount + reputation bond (Wires 2-3)</span>
              </li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
              >
                Try the playground
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
              >
                Browse agents
              </Link>
              <Link
                href="/points"
                className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
              >
                Points / airdrop
              </Link>
            </div>
          </div>
        </FadeIn>

        {/* For Builders — right panel, includes HeroCode */}
        <FadeIn delay={0.06}>
          <div className="flex h-full flex-col rounded-2xl border border-soft bg-surface/60 p-7 backdrop-blur sm:p-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-indigo">
              For builders
            </span>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-text">
              Add signed inference to your product. One install.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              OpenAI-compatible <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">/chat/completions</code> endpoint. Drop-in providers for Vercel AI
              SDK and Mastra, MCP server for Claude Desktop and Cursor, Python
              SDK with LangChain integration. Every call returns a verifiable
              receipt — your users prove what your AI told them, you prove
              what it cost.
            </p>
            <div className="mt-6">
              <HeroCode />
            </div>
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <Link
                href="/sdk"
                className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
              >
                Browse the SDK
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="https://docs.vdmnexus.com"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
              >
                Read the docs
              </a>
              <Link
                href="/inference"
                className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
              >
                Inference API
              </Link>
            </div>
          </div>
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
          <SectionEyebrow>Building something?</SectionEyebrow>
          <SectionHeading className="mt-4">Tell us about it</SectionHeading>
          <p className="mt-4 text-base text-text-muted">
            Mainnet is live and the SDK is on npm — no gate. Drop a note
            if you&apos;re shipping with Nexus; we&apos;d like to know what
            you&apos;re building and we&apos;ll send the occasional build-log
            digest your way.
          </p>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-10 text-left">
          <WaitlistForm />
        </FadeIn>
      </div>
    </Section>
  );
}
