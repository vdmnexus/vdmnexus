// Public-facing projection of the agent's bet data. Used by the
// /agents/predictions page and the /api/predictions route. The shape
// is deliberately narrower than PolymarketBet — no failure_reason,
// no order_id, no full agent_pubkey, no internal lifecycle fields.

import type { BetOutcome, BetSide, BetStatus } from "./polymarket-types";

export type PublicBet = {
  id: string;
  created_at: string;
  market_question: string;
  market_category: string | null;
  market_close_at: string | null;
  side: BetSide;
  stake_usdc: string | number;
  price: string | number;
  receipt_id: string;
  agent_pubkey_short: string | null;
  model: string;
  reasoning_text: string;
  reasoning_excerpt: string | null;
  confidence: string | number | null;
  status: Exclude<BetStatus, "failed" | "cancelled">;
  resolved_at: string | null;
  resolved_outcome: BetOutcome | null;
  pnl_usdc: string | number | null;
};

export type PublicSummary = {
  total_bets: number;
  open_bets: number;
  resolved_bets: number;
  wins: number;
  losses: number;
  invalids: number;
  win_rate: number | null;
  total_staked_usdc: number;
  total_pnl_usdc: number;
  initial_bankroll_usdc: number;
  current_bankroll_usdc: number;
  brier_score: number | null;
  paused: boolean;
};
