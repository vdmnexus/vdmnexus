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
import { Card } from "@/components/card";
import { FadeIn } from "@/components/fade-in";

export const metadata: Metadata = {
  title: "Verify a receipt — VDM Nexus",
  description:
    "Verify any signed-inference receipt — yours or someone else's. Hosted verifier at verify.vdmnexus.com or self-host with @vdm-nexus/x402. Five cryptographic checks: hashes, operator signature, on-chain settlement, payer match, recipient anchor.",
  alternates: { canonical: "https://vdmnexus.com/verify" },
  openGraph: {
    title: "Verify a receipt — VDM Nexus",
    description:
      "Hosted + self-hosted verifier for SIR v2 receipts. Five cryptographic checks, multi-chain.",
    url: "https://vdmnexus.com/verify",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "Verify a receipt — VDM Nexus",
    description:
      "Hosted + self-hosted verifier for SIR v2 receipts. Five cryptographic checks.",
  },
};

const CHECKS = [
  {
    title: "Prompt hash",
    body: "Recomputes sha256 over the prompt you provide and compares against the receipt's prompt_hash. Catches tampered or substituted prompts.",
  },
  {
    title: "Response hash",
    body: "Recomputes sha256 over the response and compares against response_hash. Catches edited model output.",
  },
  {
    title: "Operator signature",
    body: "Verifies the Ed25519 nexus_signature against the operator's published pubkey (fetched live, or pinned). Catches forged receipts.",
  },
  {
    title: "On-chain settlement",
    body: "Fetches the Solana or Base transaction by signature, confirms USDC moved in the right direction and amount. Catches receipts without payment.",
  },
  {
    title: "Payer + recipient match",
    body: "Confirms the transaction's first signer matches agent_pubkey and the funds landed at the receipt's pay_to. Catches payment-spoofing attempts.",
  },
];

const PATHS = [
  {
    title: "Hosted",
    eyebrow: "Fastest",
    body: "Paste a receipt JSON at verify.vdmnexus.com. Get a green / red verdict with each of the 5 checks broken out. No install, no keys, no account.",
    cta: { label: "Open verify.vdmnexus.com", href: "https://verify.vdmnexus.com" },
  },
  {
    title: "Self-hosted",
    eyebrow: "In your code",
    body: "Call verifyReceipt() from @vdm-nexus/x402 in any TypeScript / Node app. Same five checks, runs in your process, no network round-trip to our service.",
    cta: { label: "View on npm", href: "https://www.npmjs.com/package/@vdm-nexus/x402" },
  },
  {
    title: "Spec-compliant",
    eyebrow: "Roll your own",
    body: "The SIR v2 spec is public and MIT-licensed. Any verifier — ours, yours, or someone else's — can check the same receipts. The protocol is the product, not the library.",
    cta: { label: "Read the spec", href: "https://docs.vdmnexus.com/docs/spec/sir-v2" },
  },
];

const CODE_EXAMPLE = `import { verifyReceipt } from "@vdm-nexus/x402";

const result = await verifyReceipt({
  receipt,                              // the receipt JSON
  prompt: "what's the weather in Tokyo?",
  response: "Tokyo is 12C and clear.",
  endpoint: "https://nexus.vdmnexus.com",
});

if (result.ok) {
  console.log("verified", result.checks);
  // {
  //   prompt_hash_ok: true,
  //   response_hash_ok: true,
  //   nexus_signature_ok: true,
  //   payment_on_chain_ok: true,
  //   payer_matches: true
  // }
} else {
  console.error("verification failed", result.checks);
}`;

export default function VerifyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Verifier</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                Verify any{" "}
                <span className="text-gradient">signed inference</span> receipt.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                Yours, or someone else's. Five cryptographic checks against
                the receipt, the model output, and the on-chain payment.
                Hosted at verify.vdmnexus.com, or self-hosted with
                <span className="font-mono"> @vdm-nexus/x402</span>.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://verify.vdmnexus.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Open hosted verifier
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://docs.vdmnexus.com/docs/spec/sir-v2"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  Read the spec
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>The five checks</SectionEyebrow>
            <SectionHeading className="mt-4">
              What the verifier proves.
            </SectionHeading>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              A receipt is only as good as the verifier behind it. These are
              the five things every check answers — same set whether you use
              the hosted UI, the npm package, or roll your own from the spec.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.06}>
                <Card className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-accent-indigo/40 bg-accent-indigo/10 text-accent-indigo">
                      <Check className="h-3 w-3" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-text">
                        {c.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">
                        {c.body}
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
            <SectionEyebrow>Three paths</SectionEyebrow>
            <SectionHeading className="mt-4">
              Verify the way that fits your code.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PATHS.map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <Card className="h-full">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent-indigo">
                    {p.eyebrow}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-text">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {p.body}
                  </p>
                  <a
                    href={p.cta.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-indigo transition-colors hover:text-text"
                  >
                    {p.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Self-hosted</SectionEyebrow>
            <SectionHeading className="mt-4">
              Five-line verification in your own code.
            </SectionHeading>
          </FadeIn>
          <div className="mt-10">
            <Card className="overflow-hidden p-0">
              <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-text sm:text-sm">
                <code>{CODE_EXAMPLE}</code>
              </pre>
            </Card>
            <p className="mt-4 text-xs text-text-muted">
              Returns a boolean for each of the five checks plus an overall{" "}
              <span className="font-mono">ok</span>. Run it in CI, in a
              webhook, in a middleware — wherever you'd accept the receipt.
            </p>
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
                  <SectionEyebrow>Public feed</SectionEyebrow>
                  <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                    Verify a receipt that's already public.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    The receipt feed at /receipts is real — pick any row, open
                    its permalink, hit verify. Nothing is mocked.
                  </p>
                </div>
                <Link
                  href="/receipts"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Browse receipts
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
