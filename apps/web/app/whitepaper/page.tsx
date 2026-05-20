import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { FadeIn } from "@/components/fade-in";

export const metadata: Metadata = {
  title: "Whitepaper — VDM Nexus",
  description:
    "The one-pager. What signed inference is, why it needs a token, and how $VDMN is launched, governed, and burned.",
  alternates: { canonical: "https://vdmnexus.com/whitepaper" },
  openGraph: {
    title: "VDM Nexus — Whitepaper",
    description:
      "Signed inference, $VDMN, fair-launch on Bankr Solana. The one-pager.",
    url: "https://vdmnexus.com/whitepaper",
    siteName: "VDM Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vdmnexus",
    creator: "@vdmnexus",
    title: "VDM Nexus — Whitepaper",
    description:
      "Signed inference, $VDMN, fair-launch on Bankr Solana. The one-pager.",
  },
};

type Paper = {
  n: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Paper[] = [
  {
    n: "01",
    eyebrow: "Problem",
    title: "Every consequential agent action needs proof.",
    body: (
      <>
        <p>
          AI agents now move money, sign contracts, call APIs, and trigger
          irreversible workflows. The inference call behind each action is
          a black box: the caller cannot prove which model answered, what
          it answered, what it cost, or that it ran at all. Auditors,
          regulators, counterparties, and the agent's own principal have
          no cryptographic ground truth — only screenshots and trust.
        </p>
        <p className="text-text-muted">
          {`{{TODO: founder voice here — concrete failure mode, ideally a recent agent incident in the news.}}`}
        </p>
      </>
    ),
  },
  {
    n: "02",
    eyebrow: "Solution",
    title: "SIR v2 — Signed Inference Receipts.",
    body: (
      <>
        <p>
          Every inference call through VDM Nexus returns a v2 Signed
          Inference Receipt: an Ed25519-signed object committing to the
          prompt hash, response hash, model, cost, balance, timestamp,
          and (for paid calls) the on-chain USDC transfer. Verifying a
          receipt is a single function call that proves five things at
          once, with no trust in the operator.
        </p>
        <p>
          The receipt format is open and free to implement. The
          specification lives at{" "}
          <a
            href="https://docs.vdmnexus.com/docs/spec/sir-v2"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            docs.vdmnexus.com/docs/spec/sir-v2
          </a>
          . The reference verifier ships in{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            @vdm-nexus/x402
          </code>
          ; the hosted verifier runs at verify.vdmnexus.com.
        </p>
      </>
    ),
  },
  {
    n: "03",
    eyebrow: "Token role",
    title: "Day-1 credibility, then real cashflow.",
    body: (
      <>
        <p>
          On day one, $VDMN is a credibility currency: a public,
          fair-launched marker that the people building signed inference
          are committing to it on-chain alongside everyone else, without
          a hidden allocation. That alone is not utility.
        </p>
        <p>
          Within roughly thirty days of launch, two utility wires go
          live. Holders of a threshold balance receive a per-call
          discount on{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            /v1/chat/completions
          </code>
          . A slice of the protocol's settled USDC inference revenue
          auto-buys $VDMN on Raydium and burns it — real cashflow,
          on-chain provable, slope tied to actual usage.
        </p>
      </>
    ),
  },
  {
    n: "04",
    eyebrow: "Mechanism",
    title: "Fair launch via Bankr. No team supply. Transparent treasury.",
    body: (
      <>
        <p>
          $VDMN launches through Bankr on Solana — a Raydium-anchored
          bonding curve that allocates every $VDMN at the same curve
          price as every other buyer at the same moment. There is no
          pre-mint, no insider round, no team supply, no vesting cliff,
          and no configurable distribution. The mint, freeze, and update
          authorities are verified revoked within the first hour and
          publicly checkable on Solscan.
        </p>
        <p>
          The treasury position — approximately 5–8% of supply — is
          bought on-curve at launch in a single transaction signed by a
          Solana Squads multisig. The buy signature, size, and multisig
          address are posted in the launch thread. Subsequent multisig
          activity is on-chain and signed by multiple keys.
        </p>
      </>
    ),
  },
  {
    n: "05",
    eyebrow: "Roadmap",
    title: "Where the rail goes next.",
    body: (
      <ul className="ml-5 list-disc space-y-3 marker:text-accent-indigo">
        <li>
          <span className="text-text">50+ live agents</span> running on
          the signed-inference rail with public receipts, indexed on{" "}
          <Link
            href="/points"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            /points
          </Link>
          .
        </li>
        <li>
          <span className="text-text">Mainnet flip</span> of the
          facilitator — KMS-signed, spend-capped, kill-switched, public
          bounty.
        </li>
        <li>
          <span className="text-text">Framework adapters</span> in{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            @vdmnexus/sdk
          </code>
          : LangGraph, Mastra, OpenAI Assistants. One install, signed by
          default.
        </li>
        <li>
          <span className="text-text">Enterprise verify SaaS</span> on
          verify.vdmnexus.com — receipt search, batch verification,
          export.
        </li>
        <li className="text-text-muted">
          {`{{TODO: founder voice here — one milestone past month 6.}}`}
        </li>
      </ul>
    ),
  },
  {
    n: "06",
    eyebrow: "What this is NOT",
    title: "Stated plainly, so there is no ambiguity later.",
    body: (
      <ul className="ml-5 list-disc space-y-3 marker:text-text-muted">
        <li>
          <span className="text-text">Not financial advice.</span>{" "}
          Nothing on this site is a solicitation, recommendation, or
          guarantee. $VDMN can lose its entire value.
        </li>
        <li>
          <span className="text-text">Not a security.</span> No share,
          no profit-share, no investment contract, no return promised or
          implied. No team allocation, no vesting.
        </li>
        <li>
          <span className="text-text">Not a gated club.</span> The
          receipt spec, the verifier, and the SDK are open and MIT-
          licensed. Holders get a discount; non-holders still get
          signed inference.
        </li>
        <li>
          <span className="text-text">Not an MEV rug.</span> No bundler
          allocation, no sniper carve-out for the team. The launch tx
          is public. Treasury wallet is a Squads multisig with on-chain
          activity.
        </li>
        <li>
          <span className="text-text">Not an audit guarantee.</span>{" "}
          Receipts prove what the operator signed, not that the
          operator is honest in perpetuity. Verifiers should check
          their own threshold of independent operators before relying
          on receipts as ground truth.
        </li>
      </ul>
    ),
  },
];

export default function WhitepaperPage() {
  return (
    <main className="relative min-h-screen">
      <Nav />
      <section className="relative overflow-hidden">
        <GridBg variant="dots" />
        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-20 sm:pb-20 sm:pt-28">
          <FadeIn>
            <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
              Whitepaper · v0.1
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
              Signed inference, settled in USDC, indexed by $VDMN.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
              A one-pager on what we are building, why it needs a token,
              and exactly how $VDMN is launched and governed. Sections
              tagged{" "}
              <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
                {`{{TODO}}`}
              </code>{" "}
              are placeholders awaiting the founder's prose.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-3xl px-6 pb-20">
        <div className="space-y-14">
          {SECTIONS.map((s) => (
            <FadeIn key={s.n}>
              <article className="border-l border-soft pl-6 sm:pl-8">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-accent-indigo">
                    {s.n}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                    {s.eyebrow}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  {s.title}
                </h2>
                <div className="mt-5 space-y-4 text-base leading-relaxed text-text-muted">
                  {s.body}
                </div>
              </article>
            </FadeIn>
          ))}
        </div>

        <FadeIn>
          <div className="mt-20 flex flex-wrap items-center gap-3 border-t border-soft pt-10">
            <Link
              href="/token"
              className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
            >
              See the token page
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="https://verify.vdmnexus.com"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
            >
              Verify a receipt
            </a>
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
            >
              Roadmap
            </Link>
          </div>
          <p className="mt-6 text-xs text-text-muted">
            This is v0.1 of the whitepaper — a public skeleton. The
            authoritative version, once finalized, will be PDF-archived
            and hash-pinned for citation.
          </p>
        </FadeIn>
      </section>

      <Footer />
    </main>
  );
}
