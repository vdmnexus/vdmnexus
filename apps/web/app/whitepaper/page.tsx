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
    "The one-pager. Signed inference receipts (SIR v2), $NEXUS with a four-wire utility calendar, fair launch on pump.fun with USDC pair on Solana.",
  alternates: { canonical: "https://vdmnexus.com/whitepaper" },
  openGraph: {
    title: "VDM Nexus — Whitepaper",
    description:
      "Signed inference, $NEXUS four-wire utility, fair launch on pump.fun with USDC pair on Solana. The one-pager.",
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
      "Signed inference, $NEXUS four-wire utility, fair launch on pump.fun with USDC pair on Solana.",
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
          Current state, plainly: the rail is live on Solana mainnet
          and Base mainnet at nexus.vdmnexus.com (mainnet since
          2026-05-21). $NEXUS launches via{" "}
          <span className="text-text">pump.fun with USDC pair on Solana</span>
          {" "}— USDC-denominated pricing, not SOL beta. The receipt
          format is stable; the four utility wires light up on the
          0/30/60/90 calendar in Section 03.
        </p>
      </>
    ),
  },
  {
    n: "03",
    eyebrow: "Token role",
    title: "Four utility wires on a dated calendar.",
    body: (
      <>
        <p>
          $NEXUS is the security and settlement asset of the
          signed-inference rail. Utility ships on a 0/30/60/90 calendar
          — each wire a concrete on-chain mechanism with a public ship
          date. Nothing aspirational, no "later" framing.
        </p>
        <ul className="ml-5 list-disc space-y-3 marker:text-accent-indigo">
          <li>
            <span className="text-text">Wire 1 (Day 0, launch):</span>{" "}
            receipt fee + buy-and-burn. Every paid call adds a $0.01
            USDC receipt fee. 50% routes to a public buy-and-burn bot:
            USDC → $NEXUS swap on the pump.fun pool → burn to a public
            address. Live counter on{" "}
            <Link
              href="/token"
              className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
            >
              /token
            </Link>
            . Burn pressure scales with rail usage.
          </li>
          <li>
            <span className="text-text">Wire 2 (Day 30):</span>{" "}
            holder discount on{" "}
            <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
              /v1/chat/completions
            </code>
            . Hold ≥ threshold $NEXUS → ~20% discount on USDC inference
            price. Exact threshold and percentage published 7 days
            before the wire goes live.
          </li>
          <li>
            <span className="text-text">Wire 3 (Day 60):</span>{" "}
            agent reputation bond. Agents stake $NEXUS into a
            non-custodial bond. Unlocks trust badge on{" "}
            <Link
              href="/agents"
              className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
            >
              /agents
            </Link>
            , additional per-call discount, 2× rate limit. Slashable
            for misbehavior. 14-day unbonding.
          </li>
          <li>
            <span className="text-text">Wire 4 (Day 90):</span>{" "}
            verifier staking. Stake $NEXUS to run a verifier node. 40%
            of verify.vdmnexus.com paid-tier revenue distributes
            pro-rata to staked verifiers, weighted by stake × uptime.
            Slashable for false attestations.
          </li>
        </ul>
        <p className="text-text">
          $NEXUS is not a governance token, not a profit-share, not a
          revenue claim, not a security offered for sale. Each wire is
          a mechanical on-chain function tied to operational rail
          usage. The token's value, if any, is derived from rail
          adoption — nothing else.
        </p>
      </>
    ),
  },
  {
    n: "04",
    eyebrow: "Mechanism",
    title: "pump.fun fair launch with USDC pair on Solana. No exceptions.",
    body: (
      <>
        <p>
          $NEXUS launches via pump.fun with a USDC pair on Solana
          mainnet. USDC pairing means dollar-denominated pricing — no
          SOL beta riding under the token's MCAP. Every allocation is
          public, every contract is verifiable on Solscan, and every
          credibility signal a trader runs as a standard checklist is
          stated below.
        </p>
        <ul className="ml-5 list-disc space-y-2.5 marker:text-accent-indigo">
          <li>
            <span className="text-text">100,000,000,000 $NEXUS</span>{" "}
            total supply. Mint authority disabled at deploy. Supply
            cannot grow.
          </li>
          <li>
            <span className="text-text">70% liquidity pool</span>,
            seeded into the pump.fun USDC pool at deploy. LP burned at
            bonding completion. Liquidity cannot be withdrawn by the
            team.
          </li>
          <li>
            <span className="text-text">15% treasury vault</span>,
            held by a Squads multisig vesting program on Solana —
            vault-locked 90 days from deploy, then linear-vested over
            12 months. Vesting schedule immutable, enforced by the
            on-chain vesting contract. No cliff unlocks; maximum daily
            unlock after lockup is approximately 41M $NEXUS (about
            0.04% of supply per day).
          </li>
          <li>
            <span className="text-text">10% retroactive airdrop</span>,
            held in a non-spendable Squads multisig until criteria are
            published within 90 days of launch. Recipients vest over 6
            months from the distribution date.
          </li>
          <li>
            <span className="text-text">5% community pool</span>,
            publicly tracked Squads multisig, no lockup. Used for
            ecosystem incentives and pattern-library bounties.
          </li>
          <li>
            <span className="text-text">USDC-denominated pricing</span>{" "}
            at deploy via the pump.fun USDC pair. MCAP is reported in
            dollars, not SOL — removes SOL volatility from the token's
            chart.
          </li>
          <li>
            <span className="text-text">All Squads addresses published</span>{" "}
            24–48 hours before launch. Three separate Squads multisigs,
            not bundled, not clustered. Bubblemaps Solana will show
            three distinct allocations.
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
          <span className="text-text">Day 0 (launch):</span> token live
          on pump.fun USDC pair on Solana. Wire 1 (receipt fee +
          buy-and-burn) active immediately — burn address public, live
          counter on /token. Allocations verifiable on Solscan and
          Bubblemaps Solana within minutes of deploy.
        </li>
        <li>
          <span className="text-text">Day 30:</span> Wire 2 — holder
          discount on{" "}
          <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
            /v1/chat/completions
          </code>{" "}
          live. Threshold and exact discount percentage published 7
          days prior.
        </li>
        <li>
          <span className="text-text">Day 60:</span> Wire 3 — agent
          reputation bond live. Trust badge on /agents directory, bond
          contract on Solana, slashing flow specified.
        </li>
        <li>
          <span className="text-text">Day 90:</span> Wire 4 — verifier
          staking + revenue share live. Verify SaaS paid tier ships in
          parallel; 40% of revenue routes to staked verifiers.
          Retroactive airdrop criteria published; eligible recipients
          identified, distribution begins vesting over 6 months.
        </li>
        <li>
          <span className="text-text">Post-90:</span> Mission Control
          v0 GA, cross-agent learning network (Task Index → Pattern
          Library → Private Learning Loop), framework adapters
          (LangChain, LangGraph, Vercel AI SDK, Coinbase AgentKit),
          ERC-8004 agent card publication, AI Act Article 12 one-pager.
          Specific milestones tracked on{" "}
          <Link
            href="/roadmap"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            /roadmap
          </Link>
          .
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
          a revenue claim, not a profit share. Wires 3-4 (bond,
          verifier staking) are operational mechanisms with mechanical
          on-chain functions, not financial instruments. Final
          structure of Wires 3-4 is subject to a Spanish legal scoping
          memo (Pérez-Llorca / Cuatrecasas / Finreg360) under ESMA
          March 2025 Guidelines and CNMV MiCA Q&A; wires may be
          restructured or deferred if scoping finds CASP exposure.
        </li>
        <li>
          <span className="text-text">Not a gated club.</span> The
          receipt spec, the verifier, and the SDK are open and MIT-
          licensed. Holders get the discount; non-holders still get
          signed inference at standard USDC pricing.
        </li>
        <li>
          <span className="text-text">Not a bundler rug.</span> No
          team allocation, no sniper carve-out, no insider rounds. The
          launch transaction is public on pump.fun. Treasury, airdrop
          holding, and community pool each sit in a separate Squads
          multisig on Solana — Bubblemaps Solana renders three
          distinct allocations, not a cluster.
        </li>
        <li>
          <span className="text-text">No paid security audit at this
          stage (Beta).</span> Code is open-source under MIT; public
          review is encouraged at{" "}
          <a
            href="https://github.com/vdmnexus/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            github.com/vdmnexus/vdmnexus
          </a>
          . An Immunefi bounty and a third-party audit are on the
          post-launch roadmap, gated on revenue.
        </li>
        <li>
          <span className="text-text">Solo founder, Spain.</span>{" "}
          Operated by a Spain-resident{" "}
          <span className="text-text">autónomo</span> (natural person,
          registered with Agencia Tributaria; not a legal-entity
          SL). CNMV is the relevant CASP supervisor under MiCA. No
          investor money, no VC backing, no incubator. A legal-entity
          structure (Spanish SL or partner foundation) may be formed
          to issue and steward the token; status disclosed on{" "}
          <Link
            href="/disclosures"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            /disclosures
          </Link>
          {" "}before launch.
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
  {
    n: "07",
    eyebrow: "Cross-agent learning",
    title: "Agents on Nexus get smarter together — without sharing what they shouldn't.",
    body: (
      <>
        <p>
          Every receipt makes the rail's collective intelligence
          richer. Three layers, three different privacy postures, all
          enforced cryptographically rather than by policy.
        </p>
        <ul className="ml-5 list-disc space-y-3 marker:text-accent-indigo">
          <li>
            <span className="text-text">Task Index (automatic, anonymous, public).</span>{" "}
            Every receipt is task-classified at write time. Aggregate
            stats — "for task X, model Y wins on cost/quality" — exposed
            via{" "}
            <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
              nexus.recommend(task)
            </code>{" "}
            and on Mission Control. Content never leaves the operator's
            runtime. Differential privacy noise on small cohorts.
          </li>
          <li>
            <span className="text-text">Pattern Library (opt-in, anonymized, attributed).</span>{" "}
            Operators can publish templatized prompt patterns (PII
            stripped, structure preserved). Patterns earn $NEXUS
            bounties when forked by other agents. Reciprocity: the
            longer you contribute, the more of the commons you can
            consume.
          </li>
          <li>
            <span className="text-text">Private Learning Loop (closed, per-tenant).</span>{" "}
            Each operator's own receipts feed a private learning loop
            that never leaves their tenant boundary. Suggested prompt
            edits, optimal model routing per workload, exportable
            Memory Bundles. Their data, their asset.
          </li>
        </ul>
        <p>
          Privacy commitments: default-private (receipts carry hashes
          only), tenancy isolation (no cross-tenant leakage of content
          or behavior), opt-in by category (publish customer-support
          patterns but never financial-analysis ones), differential
          privacy on aggregates. The receipt's hash structure makes
          this architecturally enforceable, not policy-enforceable.
        </p>
      </>
    ),
  },
  {
    n: "08",
    eyebrow: "Trust products",
    title: "Autonomous agents need bounded, observable, governed downside.",
    body: (
      <>
        <p>
          The bottleneck for autonomous AI adoption isn't model
          capability — it's bounded downside. Five products, each a
          thin UX wrapper over a SIR v2 primitive, ship across the
          post-launch quarter:
        </p>
        <ul className="ml-5 list-disc space-y-3 marker:text-accent-indigo">
          <li>
            <span className="text-text">Agent Wallet.</span> Browser
            keypair, USDC funding, per-call + daily caps, real-time
            receipt feed, one-click pause / drain. Default to
            integrating Coinbase Agentic Wallets / Privy / Crossmint
            where they fit; build only the surfaces those don't cover.
          </li>
          <li>
            <span className="text-text">Supervisor.</span> A second
            agent watching the worker's receipt stream in real-time,
            enforcing policies (cost / content / pattern), paging a
            human only when policy fires. Itself receipt-driven —
            recursively auditable. Lands as a LangGraph callback,
            not a standalone framework.
          </li>
          <li>
            <span className="text-text">Memory Inbox.</span> Every
            memory addition surfaces as a diff. Approve / reject /
            edit per item, or set policy. Memory state is a signed
            bundle — portable, verifiable, exportable. Memory becomes
            a managed object, not a vendor liability.
          </li>
          <li>
            <span className="text-text">Context Pre-flight.</span>{" "}
            Before any inference call above threshold, the agent shows
            token count, sources, estimated cost. One-tap approval or
            policy. Pre-flight is recorded in the receipt as{" "}
            <code className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[12px] text-text">
              context_manifest_hash
            </code>
            {" "}— compliance becomes auditable later.
          </li>
          <li>
            <span className="text-text">Receipt-backed Escrow.</span>{" "}
            Payment held until outcome attestation is signed. Disputes
            settled by bonded verifiers (Wire 4 stakers); loser's
            $NEXUS bond is slashed. Mechanical recourse without
            lawyers.
          </li>
        </ul>
        <p>
          The vertical wedge is on-chain autonomous trading and
          prediction-market agents — that's where receipts compound
          fastest and CT engagement is highest. The same primitives
          serve every autonomous agent over time: AI-managed funds,
          DeFi vault managers, content / customer-service shops,
          governance bots, audit trails for regulated industries.
          Receipts diversify naturally as the rail matures.
        </p>
      </>
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
