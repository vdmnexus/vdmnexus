import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { FadeIn } from "@/components/fade-in";
import { launchLive } from "@/lib/launch-flag";

export const metadata: Metadata = {
  title: "Whitepaper — VDM Nexus",
  description:
    "The one-pager. Signed inference receipts (SIR v2), $NEXUS as a discount token, fair launch on Clanker v4 on Base.",
  alternates: { canonical: "https://vdmnexus.com/whitepaper" },
  openGraph: {
    title: "VDM Nexus — Whitepaper",
    description:
      "Signed inference, $NEXUS discount token, fair launch on Clanker v4 on Base. The one-pager.",
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
      "Signed inference, $NEXUS discount token, fair launch on Clanker v4 on Base. The one-pager.",
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
          <Todo>founder voice here — concrete failure mode, ideally a recent agent incident in the news.</Todo>
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
          Inference Receipt: a JWT-style, Ed25519-signed object
          committing to the prompt hash, response hash, model, cost,
          balance, timestamp, and the on-chain USDC transfer for paid
          calls. Think of it as a JWT for agent actions — a signed,
          self-contained proof of what happened.
        </p>
        <p>
          SIR v2 is an open spec under MIT. Anyone can implement it.
          Anyone can verify a receipt without trusting the operator.
          The specification is published at{" "}
          <a
            href="https://docs.vdmnexus.com/docs/spec/sir-v2"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            docs.vdmnexus.com/docs/spec/sir-v2
          </a>
          . The reference verifier ships in the MIT-licensed{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            @vdm-nexus/x402
          </code>{" "}
          package and the hosted verifier runs at verify.vdmnexus.com.
        </p>
        <p>
          Current state, plainly: the reference implementation is live
          on Solana devnet at nexus.vdmnexus.com. The mainnet flip to
          Base is scheduled around the $NEXUS launch — the receipt
          format is stable; the chain is the part that changes.
        </p>
      </>
    ),
  },
  {
    n: "03",
    eyebrow: "Token role",
    title: "Credibility currency with a near-term utility path.",
    body: (
      <>
        <p>
          Day one, the token does nothing in the product. Stated
          plainly: holders cannot use $NEXUS to pay for inference, vote
          on anything, claim revenue, or stake at launch. The token is
          tradeable, the allocations are verifiable on-chain, and the
          remaining wires are roadmap.
        </p>
        <p>
          Within 30 days of launch, the holder-discount wire ships.
          Holders of a threshold balance receive a per-call discount on{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            /v1/chat/completions
          </code>
          . Target is approximately 20%; exact threshold and percentage
          finalize before the wire goes live. This is the credibility-
          currency phase converting into utility on a public timeline.
        </p>
        <p className="text-text">
          The token is not a governance token. It is not a revenue
          claim. It is not a security offered for sale. It is not a
          staking instrument. It is a discount mechanism for verified
          inference API calls. That is the entire utility story on
          launch day.
        </p>
      </>
    ),
  },
  {
    n: "04",
    eyebrow: "Mechanism",
    title: "Clanker v4 fair launch on Base. No exceptions.",
    body: (
      <>
        <p>
          $NEXUS launches via Clanker v4 on Base. Every allocation is
          public, every contract is verifiable, and every credibility
          signal a trader runs as a standard checklist is stated below.
        </p>
        <ul className="ml-5 list-disc space-y-2.5 marker:text-accent-indigo">
          <li>
            <span className="text-text">100,000,000,000 $NEXUS</span>{" "}
            total supply. Mint authority disabled at deploy. Supply
            cannot grow.
          </li>
          <li>
            <span className="text-text">70% liquidity pool</span>,
            locked via Clanker v4. LP tokens not held by the team —
            access keys burned at deploy. Liquidity cannot be
            withdrawn.
          </li>
          <li>
            <span className="text-text">15% treasury vault</span>,
            vault-locked 90 days from deploy, then linear-vested over
            12 months. Vesting schedule immutable, enforced by the
            Clanker v4 vault contract. No cliff unlocks; maximum daily
            unlock after lockup is approximately 41M $NEXUS (about
            0.04% of supply per day).
          </li>
          <li>
            <span className="text-text">10% retroactive airdrop</span>,
            held in a non-spendable account until criteria are
            published within 90 days of launch. Recipients vest over 6
            months from the distribution date.
          </li>
          <li>
            <span className="text-text">5% community pool</span>,
            publicly tracked Safe multisig, no lockup. Used for
            ecosystem incentives.
          </li>
          <li>
            <span className="text-text">MEV protection enabled</span>{" "}
            at deploy via Clanker v4's native first-swap auction /
            block-delay module. The first 30 seconds of trading are
            not a sniper free-for-all.
          </li>
          <li>
            <span className="text-text">All Safe addresses published</span>{" "}
            24–48 hours before launch. Three separate Safe multisigs,
            not bundled, not clustered. Bubblemaps will show three
            distinct allocations.
          </li>
          <li>
            <span className="text-text">No team allocation</span>, no
            presale, no insider rounds, no vesting bypass, no
            configurable distribution path.
          </li>
        </ul>
      </>
    ),
  },
  {
    n: "05",
    eyebrow: "Roadmap",
    title: "Commitments with timelines. Nothing aspirational.",
    body: (
      <ul className="ml-5 list-disc space-y-3 marker:text-accent-indigo">
        <li>
          <span className="text-text">Day one:</span> token live on
          Clanker v4 on Base. Allocations verifiable on Basescan and
          Bubblemaps within minutes of deploy.
        </li>
        <li>
          <span className="text-text">Within 30 days:</span>{" "}
          holder-discount wire live on{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            /v1/chat/completions
          </code>
          . Threshold and exact discount percentage published before
          the wire goes live.
        </li>
        <li>
          <span className="text-text">Within 90 days:</span> retroactive
          airdrop criteria published. Eligible recipients identified
          and distribution begins, vesting over 6 months from
          distribution.
        </li>
        <li>
          <span className="text-text">After 90 days:</span> continued
          protocol development, SIR v2 spec maturation, ecosystem
          integrations. Specific milestones added to{" "}
          <Link
            href="/roadmap"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            /roadmap
          </Link>{" "}
          as they commit.
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
          guarantee. $NEXUS can lose its entire value.
        </li>
        <li>
          <span className="text-text">Not a security.</span> No share,
          no profit-share, no investment contract, no return promised
          or implied. No team allocation, no presale, no insider rounds.
        </li>
        <li>
          <span className="text-text">Not a governance token.</span> Not
          a revenue claim, not a staking instrument. The single
          near-term utility is a discount on signed-inference API
          calls.
        </li>
        <li>
          <span className="text-text">Not a gated club.</span> The
          receipt spec, the verifier, and the SDK are open and MIT-
          licensed. Holders get a discount; non-holders still get
          signed inference.
        </li>
        <li>
          <span className="text-text">Not an MEV rug.</span> No
          bundler allocation, no sniper carve-out for the team. The
          launch transaction is public and MEV-protected via Clanker
          v4's native module. Treasury sits in a Safe multisig on
          Base with on-chain, multi-signed activity.
        </li>
        <li>
          <span className="text-text">No paid security audit at this
          stage.</span> Code is open-source under MIT; public review
          is encouraged at{" "}
          <a
            href="https://github.com/vdmnexus/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            github.com/vdmnexus/vdmnexus
          </a>
          . An Immunefi bounty is on the roadmap.
        </li>
        <li>
          <span className="text-text">Solo founder, Spain.</span>{" "}
          Spanish S.L. active. No investor money, no VC backing, no
          incubator. A BVI foundation formation may come later; not
          committed.
        </li>
        <li>
          <span className="text-text">Real numbers, not inflated.</span>{" "}
          Current production stats at time of writing:{" "}
          <Todo>founder voice here — current agent count and signed-inference count from /points at time of publish.</Todo>{" "}
          Inflation by inactive-agent counts is explicitly avoided.
        </li>
      </ul>
    ),
  },
];

export default function WhitepaperPage() {
  if (!launchLive()) notFound();
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
              Signed inference, settled in USDC, indexed by $NEXUS.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
              A one-pager on what we are building, why it needs a token,
              and exactly how $NEXUS is launched and governed. Sections
              tagged{" "}
              <code className="rounded border border-dashed border-accent-indigo/40 bg-accent-indigo/5 px-1.5 py-0.5 font-mono text-[11px] text-accent-indigo">
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
            <a
              href="https://github.com/vdmnexus/vdmnexus"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo/60"
            >
              GitHub
            </a>
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

function Todo({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline rounded border border-dashed border-accent-indigo/40 bg-accent-indigo/5 px-1.5 py-0.5 font-mono text-[11px] text-accent-indigo">
      {`{{TODO: `}{children}{`}}`}
    </code>
  );
}
