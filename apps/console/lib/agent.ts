import { getServiceClient } from "@/lib/server-supabase";

export const PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type AgentReceipt = {
  id: string;
  model: string | null;
  cost_usdc: number | null;
  has_tx: boolean;
  network: string | null;
  created_at: string;
};

export type AgentModelCount = {
  model: string;
  count: number;
};

export type AgentProfileData = {
  pubkey: string;
  label: string | null;
  /** Placeholder — multi-agent-company hook, not wired in v0. */
  org_id: string | null;
  first_call_at: string | null;
  last_call_at: string | null;
  total_calls: number;
  total_spent_usdc: number;
  /** Vacuously 100% until the verifier flow is wired through every call. */
  verification_rate: number;
  top_models: AgentModelCount[];
  recent_receipts: AgentReceipt[];
};

const RECENT_LIMIT = 20;

export async function loadAgentProfile(
  pubkey: string
): Promise<AgentProfileData | null> {
  const supabase = getServiceClient();

  const [agentRes, recentRes, allRes] = await Promise.all([
    supabase
      .from("agents")
      .select("pubkey, label, created_at")
      .eq("pubkey", pubkey)
      .maybeSingle(),
    supabase
      .from("inference_logs")
      .select("id, model, cost_usdc, tx_signature, receipt_json, created_at")
      .eq("status", "success")
      .eq("agent_pubkey", pubkey)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("inference_logs")
      .select("model, cost_usdc, created_at")
      .eq("status", "success")
      .eq("agent_pubkey", pubkey),
  ]);

  const agent = agentRes.data as
    | { pubkey: string; label: string | null; created_at: string | null }
    | null;

  type RecentRow = {
    id: string;
    model: string | null;
    cost_usdc: number | string | null;
    tx_signature: string | null;
    receipt_json: Record<string, unknown> | null;
    created_at: string;
  };
  type AllRow = {
    model: string | null;
    cost_usdc: number | string | null;
    created_at: string;
  };

  const recent = (recentRes.data ?? []) as unknown as RecentRow[];
  const all = (allRes.data ?? []) as unknown as AllRow[];

  if (!agent && recent.length === 0 && all.length === 0) return null;

  const recent_receipts: AgentReceipt[] = recent.map((row) => {
    const payment = row.receipt_json?.payment as
      | { network?: unknown }
      | undefined;
    const network =
      payment && typeof payment.network === "string" ? payment.network : null;
    return {
      id: String(row.id),
      model: row.model,
      cost_usdc: row.cost_usdc != null ? Number(row.cost_usdc) : null,
      has_tx: row.tx_signature != null,
      network,
      created_at: row.created_at,
    };
  });

  const totalSpent = all.reduce(
    (s, r) => s + (r.cost_usdc != null ? Number(r.cost_usdc) : 0),
    0
  );
  const modelCounts = new Map<string, number>();
  for (const row of all) {
    if (!row.model) continue;
    modelCounts.set(row.model, (modelCounts.get(row.model) ?? 0) + 1);
  }
  const top_models: AgentModelCount[] = Array.from(modelCounts.entries())
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const times = all.map((r) => r.created_at).filter(Boolean).sort();
  const first_call_at = times[0] ?? null;
  const last_call_at = times[times.length - 1] ?? null;

  return {
    pubkey,
    label: agent?.label ?? null,
    org_id: null,
    first_call_at:
      agent?.created_at && (!first_call_at || agent.created_at < first_call_at)
        ? agent.created_at
        : first_call_at,
    last_call_at,
    total_calls: all.length,
    total_spent_usdc: totalSpent,
    verification_rate: 1,
    top_models,
    recent_receipts,
  };
}
