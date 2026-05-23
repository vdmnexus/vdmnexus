/**
 * Burn-pool ledger writer + exempt-pubkey config.
 *
 * The chat-completions and prepaid-inference routes both call
 * `recordBurnPoolFee` after their own ledger writes have succeeded.
 * Failures here are logged but never bubbled up to the user — the
 * receipt fee is best-effort bookkeeping, not a precondition for the
 * call returning 200.
 *
 * Idempotency: the table has a partial unique index on tx_signature,
 * so replayed x402 settlements are dropped at the database level. We
 * surface that as `replay: true` to the caller for log clarity.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeeBreakdown } from "./pricing";

export type BurnPoolSource = "chat-completions" | "inference";

export type BurnPoolInsertArgs = {
  agentPubkey: string;
  breakdown: FeeBreakdown;
  network: string;
  source: BurnPoolSource;
  /** Settlement tx signature for paid /chat/completions calls. Null on prepaid. */
  txSignature?: string | null;
  /** inference_logs.id — used in place of tx_signature on the prepaid path. */
  inferenceId?: string | null;
};

export type BurnPoolWriteResult =
  | { ok: true; replay?: false }
  | { ok: false; replay: true }
  | { ok: false; replay?: false; error: Error };

export async function recordBurnPoolFee(
  supabase: SupabaseClient,
  args: BurnPoolInsertArgs
): Promise<BurnPoolWriteResult> {
  const { error } = await supabase.from("burn_pool_ledger").insert({
    agent_pubkey: args.agentPubkey,
    fee_usdc: args.breakdown.receiptFeeUsdc,
    burn_pool_share_usdc: args.breakdown.burnPoolShareUsdc,
    treasury_share_usdc: args.breakdown.treasuryShareUsdc,
    network: args.network,
    source: args.source,
    tx_signature: args.txSignature ?? null,
    inference_id: args.inferenceId ?? null,
  });
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, replay: true };
    }
    return { ok: false, error: error as Error };
  }
  return { ok: true };
}

/**
 * Comma-separated allowlist of agent pubkeys exempt from the receipt
 * fee. Used to keep the playground sponsor agent (or any other
 * operator-funded probe agent) from inflating the burn counter with
 * its own calls. Empty (default) means no exemptions — every paid
 * call accrues a fee.
 */
export function getFeeExemptPubkeys(): Set<string> {
  const raw = process.env.NEXUS_FEE_EXEMPT_PUBKEYS?.trim();
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );
}
