import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentStats = {
  points_total: number;
  total_calls: number;
  last_call_at: string | null;
};

/**
 * Compute aggregate inference stats for an agent.
 *
 * Pulls raw rows and reduces in JS instead of using PostgREST's
 * `points.sum()` syntax — the Supabase project has aggregate functions
 * disabled (PostgREST's default, `db-aggregates-enabled=false`), which
 * causes those queries to fail with PGRST123 ("Use of aggregate
 * functions is not allowed") and silently return null `sum`.
 *
 * At current usage this is O(N) per call. If the project later enables
 * aggregates, swap back to:
 *   .select("points.sum(), id.count(), created_at.max()")
 *   .eq("agent_pubkey", pubkey)
 *   .eq("status", "success")
 *   .single()
 * Or denormalize the totals onto the `agents` table.
 */
export async function getAgentStats(
  supabase: SupabaseClient,
  pubkey: string
): Promise<AgentStats> {
  const { data, error } = await supabase
    .from("inference_logs")
    .select("points, created_at")
    .eq("agent_pubkey", pubkey)
    .eq("status", "success");

  if (error || !data) {
    return { points_total: 0, total_calls: 0, last_call_at: null };
  }

  type Row = { points: number | null; created_at: string };
  const rows = data as unknown as Row[];

  let points_total = 0;
  let last_call_at: string | null = null;
  for (const r of rows) {
    points_total += r.points ?? 0;
    if (last_call_at === null || r.created_at > last_call_at) {
      last_call_at = r.created_at;
    }
  }

  return {
    points_total,
    total_calls: rows.length,
    last_call_at,
  };
}
