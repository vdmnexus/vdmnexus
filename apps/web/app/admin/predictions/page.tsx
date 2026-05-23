import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { PredictionsView } from "@/components/admin/predictions-view";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { isAdmin } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/server-supabase";
import type {
  PolymarketAgentState,
  PolymarketBet,
} from "@/lib/polymarket-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchData(): Promise<{
  bets: PolymarketBet[];
  state: PolymarketAgentState;
}> {
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

  const bets = (betsRes.data ?? []) as PolymarketBet[];
  const state = (stateRes.data ?? {
    id: "singleton",
    updated_at: new Date().toISOString(),
    initial_bankroll_usdc: 500,
    paused: false,
    pause_reason: null,
    paused_at: null,
    bets_today: 0,
    bets_today_date: new Date().toISOString().slice(0, 10),
  }) as PolymarketAgentState;

  return { bets, state };
}

export default async function AdminPredictionsPage() {
  if (!(await isAdmin())) {
    redirect("/admin/login?next=/admin/predictions");
  }

  const { bets, state } = await fetchData();

  return (
    <main className="relative min-h-screen">
      <Nav />
      <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Admin · private
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
              Polymarket agent
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              Founder-only view of the flagship prediction-market agent.
              Every bet carries a signed inference receipt; click through to
              verify it on <code>vdmnexus.com/r/&lt;id&gt;</code>. Public
              dashboard is gated on the Spanish-counsel memo — see{" "}
              <code>agents/polymarket/README.md</code>.
            </p>
          </div>
          <SignOutButton />
        </header>

        <PredictionsView initialBets={bets} initialState={state} />
      </section>
    </main>
  );
}
