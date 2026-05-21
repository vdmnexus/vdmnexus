import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
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

const APPLICATION_FORM_URL = "https://tally.so/r/EkZ40l";
const APPLICATION_FORM_EMBED_URL =
  "https://tally.so/embed/EkZ40l?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&formEventsForwarding=1";
// CTAs for the culture survey + contributor agreement are intentionally
// hidden until the real URLs are live. The step text in STEPS describes
// what happens; visitors get the workflow without dead clicks.

export const metadata: Metadata = {
  title: "Build with VDM Nexus",
  description:
    "Recruiting the first 1–2 collaborators on the trust layer for AI agents. No salary yet — real equity, meaningful $NEXUS allocation, and a seat at the table on a three-week-old project.",
  alternates: { canonical: "https://vdmnexus.com/team" },
  openGraph: {
    title: "Build with VDM Nexus",
    description:
      "Open-standard infrastructure for signed AI inference. Recruiting the first 1–2 collaborators — pre-token, pre-revenue, real upside.",
    url: "https://vdmnexus.com/team",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "Build with VDM Nexus",
    description:
      "Open-standard infrastructure for signed AI inference. Recruiting the first 1–2 collaborators.",
  },
};

const SHIPPED = [
  "Open spec for signed AI inference receipts (SIR v2)",
  "Multi-chain x402 rail — Solana and Base — live in production",
  "Four SDKs on npm — MIT licensed",
  "Live receipt verifier at verify.vdmnexus.com",
  "Public points leaderboard at /points",
];

const GET = [
  "Meaningful $NEXUS allocation, carved from the contributor pool",
  "Equity — 4-year vest, 1-year cliff",
  "Public credit — your name on what we ship",
  "Decision autonomy on the work you own",
  "Seat at the table on a three-week-old project",
];

const CANT_OFFER = [
  "Salary — not until first revenue",
  "Stability — this might not work",
  "An audited codebase — bootstrapped, no paid audit yet",
  "A playbook — we are figuring it out as we go",
];

const LOOKING_FOR = [
  "You would build in this space whether anyone paid you or not",
  "Crypto-native and AI-native — not just one",
  "High agency — you ship without supervision",
  "Strong opinions about agent infrastructure, weakly held",
];

const STEPS = [
  {
    title: "Fill the application",
    body: "Short application form — what you have built, what pulls you to this space.",
    cta: { label: "Open form", href: APPLICATION_FORM_URL },
  },
  {
    title: "Culture survey",
    body: "Ten questions, ~10 minutes. How you work, how you decide, what you walk away from. Link arrives with the application response.",
  },
  {
    title: "Paid-in-future trial",
    body: "One-week trial on a real task. Paid retroactively from first revenue or token unlock, whichever lands first.",
  },
  {
    title: "Contributor agreement",
    body: "Written agreement covering equity, token allocation, vest, and IP. Template shared after the trial week.",
  },
  {
    title: "Welcome aboard",
    body: "You get a key, a Linear seat, and a backlog with your name on it.",
  },
];

export default function TeamPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Recruiting</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl md:text-6xl">
                Build the{" "}
                <span className="text-gradient">trust layer</span> for AI
                agents
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
                VDM Nexus is open-standard infrastructure for signed AI
                inference — receipts an auditor can verify, settled on
                Solana and Base. Three weeks old, solo founder, pre-token,
                pre-revenue. I&apos;m recruiting the first one or two
                collaborators. No salary yet — real equity and meaningful
                token allocation if this works.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={APPLICATION_FORM_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                >
                  Start the application
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="#process"
                  className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
                >
                  How it works
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>What&apos;s shipped</SectionEyebrow>
            <SectionHeading className="mt-4">
              Real surface area, already in production.
            </SectionHeading>
          </FadeIn>
          <FadeIn delay={0.1} className="mt-10">
            <Card>
              <ul className="space-y-3">
                {SHIPPED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed text-text-muted sm:text-base"
                  >
                    <Check
                      aria-hidden
                      className="mt-1 h-4 w-4 flex-shrink-0 text-accent-indigo"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>The honest deal</SectionEyebrow>
            <SectionHeading className="mt-4">
              What you&apos;d get. What I can&apos;t offer yet.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <FadeIn>
              <Card className="h-full">
                <h3 className="text-base font-semibold text-text">
                  What you&apos;d get
                </h3>
                <ul className="mt-4 space-y-3">
                  {GET.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-relaxed text-text-muted"
                    >
                      <Check
                        aria-hidden
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-indigo"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeIn>
            <FadeIn delay={0.08}>
              <Card className="h-full">
                <h3 className="text-base font-semibold text-text">
                  What I can&apos;t offer yet
                </h3>
                <ul className="mt-4 space-y-3">
                  {CANT_OFFER.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-relaxed text-text-muted"
                    >
                      <X
                        aria-hidden
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-muted"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeIn>
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Who I&apos;m looking for</SectionEyebrow>
            <SectionHeading className="mt-4">
              A short list. Self-select hard.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {LOOKING_FOR.map((item, i) => (
              <FadeIn key={item} delay={i * 0.06}>
                <Card className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs text-accent-indigo">
                      0{i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-text sm:text-base">
                      {item}
                    </p>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section id="process">
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>How it works</SectionEyebrow>
            <SectionHeading className="mt-4">
              Five steps. Optimised against wasting your time.
            </SectionHeading>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.06}>
                <Card className="h-full">
                  <span className="font-mono text-xs text-accent-indigo">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-text">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {step.body}
                  </p>
                  {step.cta && (
                    <a
                      href={step.cta.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-indigo transition-colors hover:text-text"
                    >
                      {step.cta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Apply</SectionEyebrow>
            <SectionHeading className="mt-4">
              The application form.
            </SectionHeading>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Ten short answers, ~10–15 minutes for a thoughtful response.
              If the embed doesn&apos;t load,{" "}
              <a
                href={APPLICATION_FORM_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-indigo underline-offset-4 hover:underline"
              >
                open it in Tally directly
              </a>
              .
            </p>
          </FadeIn>
          <FadeIn delay={0.1} className="mt-10">
            <div className="overflow-hidden rounded-2xl border border-soft">
              <iframe
                src={APPLICATION_FORM_EMBED_URL}
                title="VDM Nexus application form"
                loading="lazy"
                style={{ background: "transparent" }}
                className="block h-[720px] w-full border-0"
              />
            </div>
          </FadeIn>
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
                  <SectionEyebrow>Ready?</SectionEyebrow>
                  <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                    Start the application.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    The application comes first; the culture survey
                    follows.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <a
                    href={APPLICATION_FORM_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
                  >
                    Start the application
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section>
      </main>
      <Footer />
    </>
  );
}
