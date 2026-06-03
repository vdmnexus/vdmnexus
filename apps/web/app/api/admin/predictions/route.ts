import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/server-supabase";
import { summarise, type PolymarketAgentState, type PolymarketBet } from "@/lib/polymarket-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const [betsRes, stateRes] = await Promise.all([
    supabase
      .from("polymarket_bets")
      .select(
        "id, created_at, updated_at, market_id, market_question, market_category, market_close_at, side, stake_usdc, price, shares, receipt_id, agent_pubkey, model, reasoning_text, reasoning_excerpt, confidence, order_id, tx_hash, status, failure_reason, resolved_at, resolved_outcome, pnl_usdc"
      )
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

  const bets = (betsRes.data ?? []) as PolymarketBet[];
  const state = stateRes.data as PolymarketAgentState;
  const summary = summarise(bets, state);

  return NextResponse.json(
    { ok: true, summary, bets, state },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
