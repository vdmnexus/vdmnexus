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
  title: "Nexus Inference — VDM Nexus",
  description:
    "Cryptographically receipted AI inference. Solana-keypair agent identity, USDC-settled compute, append-only ledger. Live on Solana mainnet.",
};

const FEATURES = [
  {
    title: "Signed receipts",
    body:
      "Every response carries prompt_hash, response_hash, cost, balance, and timestamp — signed by the endpoint. Cryptographic proof of what happened.",
  },
  {
    title: "Keypair identity",
    body:
      "No API keys. Each agent is an Ed25519 keypair; the public key is the identity. Every request signed over the raw body, verified server-side.",
  },
  {
    title: "Append-only ledger",
    body:
      "Every USDC debit lands in an append-only credits_ledger row. Auditable per-agent spend history, replayable from genesis.",
  },
];

const STEPS = [
  {
    title: "Sign",
    body: "Your agent signs every request with its Ed25519 secret key. Public key = identity, no API key to leak.",
  },
  {
    title: "Verify",
    body: "Nexus verifies the signature, checks the nonce and timestamp, debits USDC, routes to the inference provider.",
  },
  {
    title: "Receipt",
    body: "The response carries a signed receipt of cost, balance, and content hashes. Provable, replayable, auditable.",
  },
];

export default function ComputePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Nexus Inference</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                AI inference with{" "}
                <span className="text-gradient">cryptographic receipts</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                Solana-keypair agent identity, signed requests, signed
                receipts, USDC-settled compute on an append-only ledger.
                Live on Solana mainnet today — devnet still available for
                free testing.
              </p>
              <div className="mt-10 flex items-center justify-center gap-3">
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Try the playground
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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
            <SectionEyebrow>What you get</SectionEyebrow>
            <SectionHeading className="mt-4">
              Provable inference. No black box.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <Card className="h-full">
                  <h3 className="text-base font-semibold text-text">
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

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>How it works</SectionEyebrow>
            <SectionHeading className="mt-4">
              Three steps. One receipt.
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

        <Section className="pb-32">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-radial-fade opacity-60"
              />
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div className="max-w-xl">
                  <SectionEyebrow>Get started</SectionEyebrow>
                  <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                    Inference your auditor can verify.
                  </p>
                </div>
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Try the playground
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
