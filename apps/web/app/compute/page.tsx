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
  title: "Nexus Compute — VDM Nexus",
  description:
    "Smart compute routing for AI businesses. Routes workloads to the cheapest or best provider in real-time. Accepts crypto payments for on-chain agents.",
};

const FEATURES = [
  {
    title: "Smart compute routing",
    body:
      "One API endpoint. We route every request to the best provider for your workload, in real-time.",
  },
  {
    title: "Crypto-native payments",
    body:
      "Pay in crypto. Designed for on-chain agents that hold wallets and need to settle compute on their own.",
  },
  {
    title: "Real-time provider routing",
    body:
      "We normalize pricing and reliability across providers so every workload lands on the right one without manual switching.",
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

export default function ComputePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Nexus Compute</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                Smart compute routing for{" "}
                <span className="text-gradient">AI businesses</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                One API endpoint. We route workloads to the cheapest or best
                provider in real-time, and accept crypto payments for on-chain
                agents.
              </p>
              <div className="mt-10 flex items-center justify-center gap-3">
                <Link
                  href="/#waitlist"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Join the waitlist
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="#"
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
              The compute layer your stack is missing.
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
                    Compute is the currency of autonomous AI.
                  </p>
                </div>
                <Link
                  href="/#waitlist"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
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
