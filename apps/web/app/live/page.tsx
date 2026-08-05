import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { SectionEyebrow } from "@/components/section";
import { FadeIn } from "@/components/fade-in";
import { LiveView } from "@/components/rienda/live-view";
import { isDeployed, riendaChain, riendaConfig } from "@/lib/rienda-contracts";

/**
 * /live — the Rienda stack as it actually runs on Robinhood Chain testnet.
 *
 * Two states, decided by whether a factory address is configured. Configured:
 * read the chain and show vault state, guardrail headroom, and the event feed.
 * Not configured: say the deploy hasn't happened. There is deliberately no
 * third state — no preview, no sample vault, no illustrative numbers. A
 * visitor should never have to work out which parts of this page are real.
 *
 * `force-dynamic` so the env check runs per request: adding the addresses in
 * Vercel and redeploying flips the page over with no code change.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live — Rienda on Robinhood Chain testnet | VDM Nexus",
  description:
    "Vault state, guardrail headroom, and agent activity read straight off Robinhood Chain testnet (chain id 46630). Testnet only — no real money. Empty until the contracts deploy.",
  alternates: { canonical: "https://vdmnexus.com/live" },
};

export default function LivePage() {
  const config = riendaConfig();
  const chain = riendaChain(config);
  const deployed = isDeployed(config);

  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-20 sm:pt-28">
            <FadeIn>
              <div className="flex flex-wrap items-center gap-3">
                <SectionEyebrow>Rienda · live</SectionEyebrow>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
                  Testnet · not real money
                </span>
              </div>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
                Watch the agent work.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted">
                Vault balances, the guardrail each trade has to pass, and every
                event the vault emits — read off the chain on a{" "}
                <span className="text-text">12-second</span> interval. Nothing
                on this page is simulated. If a value can&apos;t be read, it
                says so.
              </p>
            </FadeIn>

            <FadeIn delay={0.06} className="mt-8">
              <NetworkBanner
                name={chain.name}
                chainId={chain.id}
                explorer={chain.blockExplorers.default.url}
                rpc={chain.rpcUrls.default.http[0]}
              />
            </FadeIn>

            <FadeIn delay={0.1} className="mt-8">
              {deployed ? (
                <LiveView chainId={chain.id} />
              ) : (
                <NotDeployedYet chainName={chain.name} chainId={chain.id} />
              )}
            </FadeIn>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function NetworkBanner({
  name,
  chainId,
  explorer,
  rpc,
}: {
  name: string;
  chainId: number;
  explorer: string;
  rpc: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-semibold text-amber-200">
          Testnet. The money here is not real.
        </span>
        <span className="font-mono text-xs text-amber-200/70">
          {name} · chain id {chainId}
        </span>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
        Every address, balance, and trade below lives on a test network. Test
        tokens have no market value and cannot be sold. Rienda has no mainnet
        deployment: mainnet is gated behind an external audit and a legal
        review, and this page will keep saying testnet until both are done.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer noopener"
          className="text-amber-200/80 underline decoration-amber-200/30 underline-offset-4 transition-colors hover:text-amber-100"
        >
          Block explorer ↗
        </a>
        <span className="break-all text-text-muted">RPC {rpc}</span>
      </div>
    </div>
  );
}

/**
 * The pre-deploy state. No sample vault, no greyed-out numbers, no "example"
 * activity row — a visitor who scrolls this page before the deploy sees an
 * explanation, not a mock-up they might mistake for a running system.
 */
function NotDeployedYet({
  chainName,
  chainId,
}: {
  chainName: string;
  chainId: number;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface/40 p-7 backdrop-blur sm:p-9">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Status
        </span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
          Nothing deployed
        </span>
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-tight text-text">
        There is nothing to watch yet.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
        No Rienda contract exists on {chainName} (chain id {chainId}) at the
        time you loaded this page. The vault and policy-engine contracts are in
        development in a separate repo; the testnet deploy is the next
        milestone. This page reads its addresses from configuration, so it
        starts showing chain data the moment they&apos;re set — there is no
        stand-in, and no preview mode, in the meantime.
      </p>

      <div className="mt-7 border-t border-soft pt-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          What appears here after the deploy
        </div>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
          <li>
            <span className="text-text">Every vault the factory created</span>,
            with its owner and a link to the contract on the explorer.
          </li>
          <li>
            <span className="text-text">NAV and gross exposure per vault</span>,
            in settlement-token units, straight from the contract&apos;s own
            views.
          </li>
          <li>
            <span className="text-text">
              Each guardrail next to its current reading
            </span>{" "}
            — the position cap against the largest open position, the daily
            loss limit against today&apos;s realized loss, the order rate cap
            against orders this hour.
          </li>
          <li>
            <span className="text-text">Paused and hibernating state</span>, so
            a kill switch or a spent compute budget is visible rather than
            inferred from a quiet feed.
          </li>
          <li>
            <span className="text-text">
              Every event the vaults emit, newest first
            </span>
            , each linking to its transaction.
          </li>
        </ul>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/rienda"
          className="inline-flex items-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30"
        >
          How the vault works
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          Follow the roadmap
        </Link>
        <Link
          href="/disclosures"
          className="inline-flex items-center gap-2 rounded-md border border-soft bg-bg/40 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text"
        >
          Disclosures
        </Link>
      </div>
    </div>
  );
}
