/**
 * Sponsored grants — issue a small USDC credit to a fresh agent_pubkey so it
 * can make its first signed-inference call without buying USDC. The grant
 * lands in the existing `credits_ledger`, so the agent's first /v1/inference
 * call works through the regular signed-request path with no special branch
 * in the inference route.
 *
 * Rules enforced here:
 *   - One grant per agent_pubkey, ever. Enforced by the unique index on
 *     agent_grants.agent_pubkey — duplicate insert (23505) returns
 *     "grant_already_issued".
 *   - Per-IP cap (default 3). Stops one developer from spinning up a fresh
 *     keypair every minute to keep cashing in.
 *   - Global daily budget (default $5/day). Hard ceiling; fail-closed when
 *     exceeded so we never overspend the sponsored pool.
 *
 * Reads grant-config from env so the operator can tune without a redeploy:
 *   NEXUS_GRANT_AMOUNT_USDC          default 0.10
 *   NEXUS_GRANT_MAX_PER_IP            default 3
 *   NEXUS_GRANT_BUDGET_DAILY_USDC     default 5.00
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_GRANT_USDC = 0.1;
const DEFAULT_MAX_PER_IP = 3;
const DEFAULT_DAILY_BUDGET_USDC = 5.0;

function envNum(key: string, fallback: number): number {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getGrantAmountUsdc(): number {
  return envNum("NEXUS_GRANT_AMOUNT_USDC", DEFAULT_GRANT_USDC);
}

export function getGrantMaxPerIp(): number {
  return Math.max(1, Math.floor(envNum("NEXUS_GRANT_MAX_PER_IP", DEFAULT_MAX_PER_IP)));
}

export function getGrantDailyBudgetUsdc(): number {
  return envNum("NEXUS_GRANT_BUDGET_DAILY_USDC", DEFAULT_DAILY_BUDGET_USDC);
}

/**
 * Check whether the supplied IP has hit its lifetime per-IP grant cap.
 * Counts EVERY grant ever issued from this IP — not a sliding window — so a
 * single IP can never receive more than `NEXUS_GRANT_MAX_PER_IP` grants.
 */
export async function countGrantsByIp(
  supabase: SupabaseClient,
  ipHash: string
): Promise<number> {
  const { count, error } = await supabase
    .from("agent_grants")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Sum sponsored-grant USDC issued in the current UTC day. The route compares
 * this against `getGrantDailyBudgetUsdc()` and refuses to issue when adding
 * the new grant would exceed the cap.
 */
export async function sumGrantsToday(supabase: SupabaseClient): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("agent_grants")
    .select("amount_usdc")
    .gte("created_at", startOfDay.toISOString());
  if (error) throw error;
  let sum = 0;
  for (const row of data ?? []) sum += Number(row.amount_usdc);
  return sum;
}

export type IssueGrantArgs = {
  agentPubkey: string;
  ipHash: string;
  amountUsdc: number;
};

/**
 * Insert the grant record. Throws on uniqueness violation (23505) so the
 * route can map it to "grant_already_issued". Caller is responsible for
 * crediting the ledger separately — keeping the two writes split makes the
 * grant audit trail independent of credit accounting (you can later
 * reconcile by comparing agent_grants.amount_usdc against the matching
 * credits_ledger row by agent_pubkey+amount).
 */
export async function insertGrant(
  supabase: SupabaseClient,
  args: IssueGrantArgs
): Promise<void> {
  const { error } = await supabase.from("agent_grants").insert({
    agent_pubkey: args.agentPubkey,
    ip_hash: args.ipHash,
    amount_usdc: args.amountUsdc,
  });
  if (error) throw error;
}
