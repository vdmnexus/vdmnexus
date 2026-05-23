import { NextResponse } from "next/server";
import { polymarketPublic } from "@/lib/launch-flag";
import { getServiceClient } from "@/lib/server-supabase";
import {
  summarise,
  type PolymarketAgentState,
  type PolymarketBet,
} from "@/lib/polymarket-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read-only endpoint for /agents/predictions. Gated by the
// NEXT_PUBLIC_POLYMARKET_PUBLIC flag — returns 404 when the flag is
// off so the surface is indistinguishable from "doesn't exist."
// Returns a *sanitised* projection of polymarket_bets:
//   - only status IN ('open', 'resolved') — failed/cancelled hidden
//   - no failure_reason, no order_id, no full agent_pubkey
//   - reasoning text and Nexus receipt id remain (the value prop)
// RLS on polymarket_bets stays service-role-only; this route is the
// only public read path.
export async function GET() {
  if (!polymarketPublic()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const supabase = getServiceClient();
  const [betsRes, stateRes] = await Promise.all([
    supabase
      .from("polymarket_bets")
      .select(
        "id, created_at, market_id, market_question, market_category, market_close_at, side, stake_usdc, price, shares, receipt_id, agent_pubkey, model, reasoning_text, reasoning_excerpt, confidence, status, resolved_at, resolved_outcome, pnl_usdc, tx_hash, order_id, updated_at, failure_reason"
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

  if (betsRes.error || stateRes.error) {
    return NextResponse.json(
      {
        ok: false,
        error: betsRes.error?.message || stateRes.error?.message || "supabase error",
      },
      { status: 500 }
    );
  }

  const rawBets = (betsRes.data ?? []) as PolymarketBet[];
  const state = stateRes.data as PolymarketAgentState;

  // Sanitise — strip everything that's not part of the public contract.
  const bets = rawBets.map(sanitise);
  const summary = summarise(rawBets, state);

  return NextResponse.json(
    {
      ok: true,
      summary: {
        total_bets: summary.total_bets,
        open_bets: summary.open_bets,
        resolved_bets: summary.resolved_bets,
        wins: summary.wins,
        losses: summary.losses,
        invalids: summary.invalids,
        win_rate: summary.win_rate,
        total_staked_usdc: summary.total_staked_usdc,
        total_pnl_usdc: summary.total_pnl_usdc,
        initial_bankroll_usdc: summary.initial_bankroll_usdc,
        current_bankroll_usdc: summary.current_bankroll_usdc,
        brier_score: summary.brier_score,
        paused: summary.paused,
      },
      bets,
    },
    { headers: { "cache-control": "no-store" } }
  );
}

function sanitise(b: PolymarketBet) {
  return {
    id: b.id,
    created_at: b.created_at,
    market_question: b.market_question,
    market_category: b.market_category,
    market_close_at: b.market_close_at,
    side: b.side,
    stake_usdc: b.stake_usdc,
    price: b.price,
    receipt_id: b.receipt_id,
    agent_pubkey_short: b.agent_pubkey ? `${b.agent_pubkey.slice(0, 8)}…` : null,
    model: b.model,
    reasoning_text: b.reasoning_text,
    reasoning_excerpt: b.reasoning_excerpt,
    confidence: b.confidence,
    status: b.status,
    resolved_at: b.resolved_at,
    resolved_outcome: b.resolved_outcome,
    pnl_usdc: b.pnl_usdc,
  };
}
