import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import { FadeIn } from "@/components/fade-in";
import { SectionEyebrow } from "@/components/section";
import { PredictionsPublicView } from "@/components/predictions/predictions-public-view";
import { polymarketPublic } from "@/lib/launch-flag";
import { getServiceClient } from "@/lib/server-supabase";
import {
  summarise,
  type PolymarketAgentState,
  type PolymarketBet,
} from "@/lib/polymarket-types";
import type {
  PublicBet,
  PublicSummary,
} from "@/lib/polymarket-public-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Predictions — live autonomous agent on the Nexus rail",
  description:
    "A founder-operated AI agent placing bets on Polymarket. Every prediction carries a signed inference receipt. Track record + reasoning live.",
  alternates: { canonical: "https://vdmnexus.com/agents/predictions" },
};

export default async function AgentsPredictionsPage() {
  if (!polymarketPublic()) notFound();

  const { bets, summary } = await fetchData();

  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-5xl px-6 pb-12 pt-24 sm:pt-28">
            <FadeIn className="max-w-3xl">
              <SectionEyebrow>Predictions agent</SectionEyebrow>
              <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                Live autonomous agent on the Nexus rail.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-text-muted">
                A founder-operated AI agent places bets on Polymarket
                with its own USDC bankroll. Every prediction carries a
                signed inference receipt — the model's reasoning is
                cryptographically anchored to the bet via the agent
                payment rail. Click any receipt to verify it
                end-to-end on{" "}
                <code>vdmnexus.com/r/&lt;id&gt;</code>.
              </p>
              <p className="mt-4 text-sm text-text-muted">
                Not financial advice. Not a signal service. The agent
                operates with the founder's own funds and publishes
                its reasoning as AI research transparency.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <PredictionsPublicView initialBets={bets} initialSummary={summary} />
        </section>
      </main>
      <Footer />
    </>
  );
}

async function fetchData(): Promise<{
  bets: PublicBet[];
  summary: PublicSummary;
}> {
  const supabase = getServiceClient();
  const [betsRes, stateRes] = await Promise.all([
    supabase
      .from("polymarket_bets")
      .select(
        "id, created_at, updated_at, market_id, market_question, market_category, market_close_at, side, stake_usdc, price, shares, receipt_id, agent_pubkey, model, reasoning_text, reasoning_excerpt, confidence, order_id, tx_hash, status, failure_reason, resolved_at, resolved_outcome, pnl_usdc"
      )
      .in("status", ["open", "resolved"])
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("polymarket_agent_state")
      .select("*")
      .eq("id", "singleton")
      .single(),
  ]);

  const rawBets = (betsRes.data ?? []) as PolymarketBet[];
  const state = (stateRes.data ?? {
    id: "singleton",
    updated_at: new Date().toISOString(),
    initial_bankroll_usdc: 0,
    paused: false,
    pause_reason: null,
    paused_at: null,
    bets_today: 0,
    bets_today_date: new Date().toISOString().slice(0, 10),
  }) as PolymarketAgentState;

  const fullSummary = summarise(rawBets, state);
  const summary: PublicSummary = {
    total_bets: fullSummary.total_bets,
    open_bets: fullSummary.open_bets,
    resolved_bets: fullSummary.resolved_bets,
    wins: fullSummary.wins,
    losses: fullSummary.losses,
    invalids: fullSummary.invalids,
    win_rate: fullSummary.win_rate,
    total_staked_usdc: fullSummary.total_staked_usdc,
    total_pnl_usdc: fullSummary.total_pnl_usdc,
    initial_bankroll_usdc: fullSummary.initial_bankroll_usdc,
    current_bankroll_usdc: fullSummary.current_bankroll_usdc,
    brier_score: fullSummary.brier_score,
    paused: fullSummary.paused,
  };

  const bets: PublicBet[] = rawBets.map((b) => ({
    id: b.id,
    created_at: b.created_at,
    market_question: b.market_question,
    market_category: b.market_category,
    market_close_at: b.market_close_at,
    side: b.side,
    stake_usdc: b.stake_usdc,
    price: b.price,
    receipt_id: b.receipt_id,
    agent_pubkey_short: b.agent_pubkey
      ? `${b.agent_pubkey.slice(0, 8)}…`
      : null,
    model: b.model,
    reasoning_text: b.reasoning_text,
    reasoning_excerpt: b.reasoning_excerpt,
    confidence: b.confidence,
    status: b.status as PublicBet["status"],
    resolved_at: b.resolved_at,
    resolved_outcome: b.resolved_outcome,
    pnl_usdc: b.pnl_usdc,
  }));

  return { bets, summary };
}
