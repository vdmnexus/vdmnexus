export type BetStatus = "open" | "resolved" | "cancelled" | "failed";
export type BetSide = "YES" | "NO";
export type BetOutcome = "YES" | "NO" | "INVALID";

export type PolymarketBet = {
  id: string;
  created_at: string;
  updated_at: string;
  market_id: string;
  market_question: string;
  market_category: string | null;
  market_close_at: string | null;
  side: BetSide;
  stake_usdc: string | number;
  price: string | number;
  shares: string | number | null;
  receipt_id: string;
  agent_pubkey: string;
  model: string;
  reasoning_text: string;
  reasoning_excerpt: string | null;
  confidence: string | number | null;
  order_id: string | null;
  tx_hash: string | null;
  status: BetStatus;
  failure_reason: string | null;
  resolved_at: string | null;
  resolved_outcome: BetOutcome | null;
  pnl_usdc: string | number | null;
};

export type PolymarketAgentState = {
  id: "singleton";
  updated_at: string;
  initial_bankroll_usdc: string | number;
  paused: boolean;
  pause_reason: string | null;
  paused_at: string | null;
  bets_today: number;
  bets_today_date: string;
};

export type PredictionsSummary = {
  total_bets: number;
  open_bets: number;
  resolved_bets: number;
  failed_bets: number;
  wins: number;
  losses: number;
  invalids: number;
  win_rate: number | null;
  total_staked_usdc: number;
  total_pnl_usdc: number;
  initial_bankroll_usdc: number;
  current_bankroll_usdc: number;
  paused: boolean;
  pause_reason: string | null;
  bets_today: number;
  brier_score: number | null;
};

export function summarise(
  bets: PolymarketBet[],
  state: PolymarketAgentState
): PredictionsSummary {
  const total = bets.length;
  const open = bets.filter((b) => b.status === "open").length;
  const resolved = bets.filter((b) => b.status === "resolved");
  const failed = bets.filter((b) => b.status === "failed").length;

  const wins = resolved.filter(
    (b) => b.resolved_outcome && b.resolved_outcome === b.side
  ).length;
  const invalids = resolved.filter(
    (b) => b.resolved_outcome === "INVALID"
  ).length;
  const losses = resolved.length - wins - invalids;

  const decided = wins + losses;
  const winRate = decided > 0 ? wins / decided : null;

  const totalStaked = bets.reduce((acc, b) => acc + Number(b.stake_usdc || 0), 0);
  const totalPnl = resolved.reduce(
    (acc, b) => acc + Number(b.pnl_usdc || 0),
    0
  );

  const initial = Number(state.initial_bankroll_usdc);
  const current = initial + totalPnl;

  // Brier score over resolved (non-INVALID) bets where confidence is set.
  // For each bet: forecast for the side actually placed; outcome = 1 if won, 0 if lost.
  let brierSum = 0;
  let brierN = 0;
  for (const b of resolved) {
    if (b.resolved_outcome === "INVALID") continue;
    if (b.confidence == null) continue;
    const forecast = Number(b.confidence);
    const won = b.resolved_outcome === b.side ? 1 : 0;
    brierSum += (forecast - won) ** 2;
    brierN += 1;
  }
  const brier = brierN > 0 ? brierSum / brierN : null;

  return {
    total_bets: total,
    open_bets: open,
    resolved_bets: resolved.length,
    failed_bets: failed,
    wins,
    losses,
    invalids,
    win_rate: winRate,
    total_staked_usdc: round(totalStaked),
    total_pnl_usdc: round(totalPnl),
    initial_bankroll_usdc: round(initial),
    current_bankroll_usdc: round(current),
    paused: state.paused,
    pause_reason: state.pause_reason,
    bets_today: state.bets_today,
    brier_score: brier == null ? null : Math.round(brier * 1000) / 1000,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
