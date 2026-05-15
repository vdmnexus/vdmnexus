import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { Section, SectionEyebrow } from "@/components/section";
import { ComingSoonBadge } from "@/components/card";
import { FadeIn } from "@/components/fade-in";

export const metadata: Metadata = {
  title: "Nexus Agents — VDM Nexus",
  description:
    "Infrastructure for autonomous on-chain AI agents that acquire and spend compute independently.",
};

export default function AgentsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg variant="dots" />
          <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-24 sm:pb-32 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <ComingSoonBadge />
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                Nexus <span className="text-gradient">Agents</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                Infrastructure for autonomous on-chain AI agents that acquire
                and spend compute independently.
              </p>
              <div className="mt-10 flex items-center justify-center gap-3">
                <Link
                  href="/#waitlist"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Get early access
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/compute"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  See Nexus Compute
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section className="pb-32">
          <FadeIn>
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-soft bg-surface/60 p-8 text-center backdrop-blur sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-radial-fade opacity-60"
              />
              <div className="relative">
                <SectionEyebrow>What&apos;s coming</SectionEyebrow>
                <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-text-muted">
                  Agents with wallets. Agents that pay for their own
                  inference. Agent-to-agent compute markets, with no human in
                  the loop.
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
