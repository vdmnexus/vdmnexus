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
  title: "SDK — VDM Nexus",
  description:
    "Eight MIT-licensed packages that power signed inference: six on npm (sdk, x402, paywall, mcp, ai-sdk-provider, mastra-provider) and two on PyPI (vdm-nexus, langchain-vdm-nexus). Build agents that sign their own requests, pay per call in USDC, verify receipts, and serve signed inference from any framework.",
  alternates: { canonical: "https://vdmnexus.com/sdk" },
  openGraph: {
    title: "SDK — VDM Nexus",
    description:
      "Eight MIT-licensed packages — six on npm, two on PyPI — for building, paying for, verifying, and serving signed AI inference.",
    url: "https://vdmnexus.com/sdk",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "SDK — VDM Nexus",
    description:
      "Eight MIT-licensed packages — six on npm, two on PyPI — for signed AI inference.",
  },
};

type Package = {
  name: string;
  version: string;
  role: string;
  body: string;
  install: string;
  audience: string;
  npm: string;
  docs: string;
  github: string;
};

const PACKAGES: Package[] = [
  {
    name: "@vdm-nexus/sdk",
    version: "0.2.0",
    role: "Identity",
    body: "Generate a fresh Ed25519 keypair (or load an existing one), sign requests, and call any signed-inference endpoint. The agent's public key IS their identity — no API keys, no rotating secrets.",
    install: "pnpm add @vdm-nexus/sdk",
    audience: "Building an agent that calls Nexus or any SIR-compatible endpoint.",
    npm: "https://www.npmjs.com/package/@vdm-nexus/sdk",
    docs: "https://docs.vdmnexus.com/docs/sdk",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/sdk",
  },
  {
    name: "@vdm-nexus/x402",
    version: "0.4.0",
    role: "Payment + verifier",
    body: "x402-native client for paying per inference call in USDC (Solana or Base) and verifying any returned receipt end-to-end. Five-check verifier: hashes, operator signature, on-chain settlement, payer match, and recipient anchor.",
    install: "pnpm add @vdm-nexus/x402",
    audience: "Building an agent that pays per call, OR verifying receipts you got from somewhere else.",
    npm: "https://www.npmjs.com/package/@vdm-nexus/x402",
    docs: "https://docs.vdmnexus.com/docs/spec/sir-v2",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/x402",
  },
  {
    name: "@vdm-nexus/paywall",
    version: "0.1.0",
    role: "Monetize your API",
    body: "Drop-in middleware for Express, Hono, or Next.js. Wrap any handler; every paid call returns a signed Ed25519 receipt of what your handler produced. You become an SIR endpoint without writing the protocol layer.",
    install: "pnpm add @vdm-nexus/paywall",
    audience: "Monetizing your own AI API with per-call USDC + cryptographic receipts.",
    npm: "https://www.npmjs.com/package/@vdm-nexus/paywall",
    docs: "https://docs.vdmnexus.com/docs/paywall",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/paywall",
  },
  {
    name: "@vdm-nexus/mcp",
    version: "0.1.0",
    role: "Claude Desktop / Cursor",
    body: "Model Context Protocol server that exposes signed inference as a tool. Drop it into your Claude Desktop, Cursor, or any MCP-aware client config — your agent immediately gets paid calls with verifiable receipts. Zero code change.",
    install: "pnpm add @vdm-nexus/mcp",
    audience: "Plugging Nexus into a Claude Desktop / Cursor workflow without writing a custom agent.",
    npm: "https://www.npmjs.com/package/@vdm-nexus/mcp",
    docs: "https://docs.vdmnexus.com/docs/mcp",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/mcp-server",
  },
  {
    name: "@vdm-nexus/ai-sdk-provider",
    version: "0.1.0",
    role: "Vercel AI SDK",
    body: "Drop-in provider for the Vercel AI SDK. Use Nexus inference inside generateText, streamText, and tool calls without changing your codebase. Every response carries a signed receipt accessible via the provider's metadata.",
    install: "pnpm add @vdm-nexus/ai-sdk-provider",
    audience: "Already on the Vercel AI SDK and want signed-inference receipts under the hood.",
    npm: "https://www.npmjs.com/package/@vdm-nexus/ai-sdk-provider",
    docs: "https://docs.vdmnexus.com/docs/integrations/vercel-ai-sdk",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/ai-sdk-provider",
  },
  {
    name: "@vdm-nexus/mastra-provider",
    version: "0.1.0",
    role: "Mastra",
    body: "Drop-in provider for Mastra. Wire signed inference into Mastra workflows and agents with a single import; receipts thread through each response for downstream verification.",
    install: "pnpm add @vdm-nexus/mastra-provider",
    audience: "Running Mastra and want signed-inference receipts on every model call.",
    npm: "https://www.npmjs.com/package/@vdm-nexus/mastra-provider",
    docs: "https://docs.vdmnexus.com/docs/integrations/mastra",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/mastra-provider",
  },
  {
    name: "vdm-nexus",
    version: "0.2.2",
    role: "Python — identity + x402",
    body: "Python equivalent of @vdm-nexus/sdk + @vdm-nexus/x402. Generate Ed25519 agents, sign requests, pay per call in USDC on Solana or Base, verify any receipt end-to-end. Same SIR v2 format as the TypeScript stack — mix languages freely.",
    install: "uv add vdm-nexus  # or: pip install vdm-nexus",
    audience: "Building Python agents that pay per call and verify receipts.",
    npm: "https://pypi.org/project/vdm-nexus/",
    docs: "https://docs.vdmnexus.com/docs/python",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/sdk-python",
  },
  {
    name: "langchain-vdm-nexus",
    version: "0.1.0",
    role: "Python — LangChain",
    body: "LangChain adapter for Python. Use Nexus signed inference inside LangChain chains, agents, and LCEL pipelines. Receipt metadata is preserved through the LangChain runnable interface so downstream tools can verify what each model call returned.",
    install: "uv add langchain-vdm-nexus  # or: pip install langchain-vdm-nexus",
    audience: "Building LangChain agents in Python and want signed-inference receipts on every model call.",
    npm: "https://pypi.org/project/langchain-vdm-nexus/",
    docs: "https://docs.vdmnexus.com/docs/integrations/langchain",
    github: "https://github.com/vdmnexus/vdmnexus/tree/main/packages/sdk-python-langchain",
  },
];

const PRINCIPLES = [
  {
    title: "MIT, open source",
    body: "Every package is MIT-licensed and developed in the open at github.com/vdmnexus/vdmnexus. Fork it, embed it, ship it.",
  },
  {
    title: "Tiny dependency surface",
    body: "@vdm-nexus/sdk has two runtime deps. The whole chain is auditable in an afternoon. No mystery transitive load.",
  },
  {
    title: "Spec is public",
    body: "Receipts follow the SIR v2 spec. Any package — ours or someone else's — can produce or verify them. The protocol matters, not the library.",
  },
];

export default function SdkPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>SDK</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                Eight packages.{" "}
                <span className="text-gradient">One signed-inference stack.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                Six MIT-licensed packages on npm, two on PyPI. Build agents
                that sign their own requests, pay per call in USDC on Solana
                or Base, verify any receipt end-to-end, and serve signed
                inference from any framework — Vercel AI SDK, Mastra,
                LangChain, MCP, Express, Hono, Next.js.
              </p>
              <div className="mt-10 flex items-center justify-center gap-3">
                <a
                  href="https://docs.vdmnexus.com/docs/quickstart"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Quickstart
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://github.com/vdmnexus/vdmnexus"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  View on GitHub
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Packages</SectionEyebrow>
            <SectionHeading className="mt-4">
              Pick the one that matches your role.
            </SectionHeading>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Use one, use all eight — they compose without forcing a stack on
              you. Each is independently published and versioned. Mix
              TypeScript and Python freely; they speak the same SIR v2
              receipt format.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {PACKAGES.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.08}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent-indigo">
                        {p.role}
                      </span>
                      <h3 className="mt-2 font-mono text-base font-semibold text-text">
                        {p.name}
                      </h3>
                    </div>
                    <span className="rounded-md border border-soft bg-bg/60 px-2 py-0.5 font-mono text-[11px] text-text-muted">
                      v{p.version}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text-muted">
                    {p.body}
                  </p>
                  <div className="mt-4 rounded-md border border-soft bg-bg/40 p-3 font-mono text-xs text-text">
                    {p.install}
                  </div>
                  <p className="mt-4 text-xs text-text-muted">
                    <span className="font-medium text-text">Use it when </span>
                    {p.audience}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <a
                      href={p.npm}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent-indigo transition-colors hover:text-text"
                    >
                      {p.npm.includes("pypi.org") ? "pypi" : "npm"} ↗
                    </a>
                    <a
                      href={p.docs}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent-indigo transition-colors hover:text-text"
                    >
                      docs ↗
                    </a>
                    <a
                      href={p.github}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent-indigo transition-colors hover:text-text"
                    >
                      source ↗
                    </a>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>How they fit</SectionEyebrow>
            <SectionHeading className="mt-4">
              One protocol, many entry points.
            </SectionHeading>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Same SIR v2 receipt format across all eight packages.
              TypeScript or Python, OpenAI-compatible endpoint or paywall
              middleware, Vercel AI SDK or Mastra or LangChain or MCP — pick
              the surface that fits your stack. Receipts are portable across
              all of them.
            </p>
          </FadeIn>
          <div className="mt-10">
            <Card className="overflow-hidden p-0">
              <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-text-muted sm:text-sm">
                <code>{`  Agent (you)           Nexus / any SIR endpoint
  ───────────           ───────────────────────────
  @vdm-nexus/sdk        @vdm-nexus/paywall
      │                       │
      │  signed request       │  signed receipt
      └──────────────►────────┘
                              │
                              ▼
                       @vdm-nexus/x402.verifyReceipt
                              │
                       (verify 5 checks: hashes,
                        signature, on-chain tx,
                        payer match, recipient)

  Or skip the custom agent and use MCP:

  Claude Desktop / Cursor
      │
      │  config: @vdm-nexus/mcp
      └──────────────►  Nexus`}</code>
              </pre>
            </Card>
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>What we promise</SectionEyebrow>
            <SectionHeading className="mt-4">
              Three things we will not change.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <Card className="h-full">
                  <h3 className="text-base font-semibold text-text">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {p.body}
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
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div className="max-w-xl">
                  <SectionEyebrow>See it work</SectionEyebrow>
                  <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                    Every package above runs a real call in the playground.
                  </p>
                </div>
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Open playground
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
