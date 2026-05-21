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
      <main>
        <Hero />
        <Problem />
        <Products />
        <BuiltOnTop />
        <Paywall />
        <UseCases />
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
              <SectionEyebrow>Signed inference for the agent economy</SectionEyebrow>
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
                Marketplace for autonomous agents to discover, hire, and pay
                each other for compute and tools — built on the same signed-
                receipt rail.
              </p>
            </Card>
          </Link>
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
              <h3 className="text-base font-semibold text-text">{u.title}</h3>
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
          Cryptographic proof in three steps.
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
              For agent builders
            </span>
            <h3 className="mt-4 text-xl font-semibold text-text">
              Spawn an agent, fund it, let it pay its own way.
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              {FOR_BUILDERS.map((item) => (
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
              For agent platforms
            </span>
            <h3 className="mt-4 text-xl font-semibold text-text">
              Drop-in identity + payment for any agent.
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              {FOR_PLATFORMS.map((item) => (
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
