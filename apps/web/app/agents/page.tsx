import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
} from "@/components/section";
import { Card, ComingSoonBadge } from "@/components/card";
import { FadeIn } from "@/components/fade-in";

export const metadata: Metadata = {
  title: "Nexus Agents — VDM Nexus",
  description:
    "Infrastructure for autonomous AI agents. Ed25519 identity, signed-inference receipts, USDC-settled compute. Live on devnet today. Agent-git workflow primitives — provenance, payment-gated merges, signed release tags — shipping next.",
  alternates: { canonical: "https://vdmnexus.com/agents" },
  openGraph: {
    title: "Nexus Agents — VDM Nexus",
    description:
      "Infrastructure for autonomous AI agents — identity, signed receipts, payment per call. Live on devnet, agent-git primitives shipping next.",
    url: "https://vdmnexus.com/agents",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "Nexus Agents — VDM Nexus",
    description:
      "Infrastructure for autonomous AI agents — identity, signed receipts, payment per call.",
  },
};

const LIVE_TODAY = [
  {
    title: "Ed25519 keypair identity",
    body:
      "Each agent is a Solana-compatible Ed25519 keypair. The public key IS the identity — same address that signs inference requests pays for them. No API keys to rotate, no accounts to manage.",
  },
  {
    title: "Signed inference receipts (SIR v2)",
    body:
      "Every response carries a cryptographic receipt: prompt hash, response hash, model, cost, on-chain payment, operator signature. Anyone can verify it, you don't have to trust us.",
  },
  {
    title: "x402 payment per call",
    body:
      "Per-request USDC settlement via the x402 protocol. ~$0.01 per inference call. Multi-chain — Solana devnet today; mainnet + Base in the pipeline.",
  },
  {
    title: "MCP integration",
    body:
      "Plug Nexus into Claude Desktop, Cursor, or any MCP-aware client with a one-line config. Your agent inherits signed inference + verifiable receipts without writing the protocol layer.",
  },
];

const COMING_NEXT = [
  {
    title: "Provenance",
    package: "@vdm-nexus/github-app",
    body:
      "GitHub App that listens for PRs with a .nexus/receipt.json attached, verifies the receipt end-to-end, and posts a check. Free, no payment required — credible attribution for agent-authored code.",
  },
  {
    title: "Payment-gated merges",
    package: ".nexus/policy.json",
    body:
      "Repos opt in via a policy file: agent PRs require a settled x402 payment referencing the PR SHA before they can merge. Economic skin-in-the-game built into the workflow you already have.",
  },
  {
    title: "Signed release tags",
    package: "nexus release",
    body:
      "CLI wrapper that signs a receipt over the release tag SHA + author + notes, anchors it on-chain, and uploads the receipt as a release asset. Verifiable releases without changing your release process.",
  },
];

const QUICKSTART_CODE = `import { Agent } from "@vdm-nexus/sdk";
import { X402Agent } from "@vdm-nexus/x402";

// 1. Mint or load an agent identity (Ed25519 keypair)
const agent = X402Agent.fromBase58(process.env.AGENT_SECRET);

// 2. Call signed inference — pay-as-you-go, no API key
const result = await agent.payAndInfer("https://nexus.vdmnexus.com/api/v1", {
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "..." }],
});

// 3. The response includes a signed receipt anyone can verify
console.log(result.receipt.nexus_signature);`;

export default function AgentsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg variant="dots" />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Nexus Agents</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                Infrastructure for{" "}
                <span className="text-gradient">autonomous agents</span>.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                Agents authenticate with an Ed25519 keypair, pay per inference
                call in USDC, and get a signed receipt of every response. Live
                on devnet today. Agent-git workflow primitives shipping next.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://docs.vdmnexus.com/docs/quickstart"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Quickstart
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  Try the playground
                </Link>
                <Link
                  href="/sdk"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  See the SDK
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section>
          <FadeIn className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-text">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo" />
                Live today
              </span>
              <span className="text-xs text-text-muted">devnet</span>
            </div>
            <SectionHeading className="mt-4">
              What an agent gets, right now.
            </SectionHeading>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Shipped, running in production, verifiable on-chain. Use any of
              the four pieces below independently — they compose without
              forcing a stack.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {LIVE_TODAY.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <Card className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-accent-indigo/40 bg-accent-indigo/10 text-accent-indigo">
                      <Check className="h-3 w-3" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-text">
                        {f.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">
                        {f.body}
                      </p>
                    </div>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Quickstart</SectionEyebrow>
            <SectionHeading className="mt-4">
              Three lines to a paid, signed call.
            </SectionHeading>
          </FadeIn>
          <div className="mt-10">
            <Card className="overflow-hidden p-0">
              <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-text sm:text-sm">
                <code>{QUICKSTART_CODE}</code>
              </pre>
            </Card>
            <p className="mt-4 text-xs text-text-muted">
              Full quickstart at{" "}
              <a
                href="https://docs.vdmnexus.com/docs/quickstart"
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-indigo hover:text-text"
              >
                docs.vdmnexus.com/docs/quickstart
              </a>
              . Pair with{" "}
              <Link
                href="/sdk"
                className="text-accent-indigo hover:text-text"
              >
                @vdm-nexus/mcp
              </Link>{" "}
              to wire signed inference into Claude Desktop or Cursor without
              writing a custom agent.
            </p>
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <ComingSoonBadge />
            <SectionHeading className="mt-4">
              Agent-git workflow primitives.
            </SectionHeading>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Three discrete products that turn the signed-inference rail
              into a workflow teams can adopt. Each one ships independently.
              Order matters — provenance first (free, low friction), then
              economics, then audit.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {COMING_NEXT.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <Card className="h-full">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent-indigo">
                    {f.package}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-text">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {f.body}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section className="pb-32">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-radial-fade opacity-60"
              />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <ComingSoonBadge />
                  <span className="text-xs text-text-muted">later</span>
                </div>
                <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  Agent marketplace.
                </h2>
                <p className="mt-4 max-w-2xl text-balance text-sm leading-relaxed text-text-muted sm:text-base">
                  Agent registries. Agent-to-agent compute markets.
                  Pay-per-call tool invocations between autonomous agents —
                  every transaction settled in USDC, every call receipted.
                  No human in the loop. Sits on top of everything above; not
                  a separate stack.
                </p>
                <Link
                  href="/#waitlist"
                  className="mt-8 inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Join the waitlist
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </Section>
      </main>
      <Footer />
    </>
  );
}
