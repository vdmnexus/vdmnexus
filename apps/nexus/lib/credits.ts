import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureAgent(
  supabase: SupabaseClient,
  pubkey: string
): Promise<void> {
  const { error } = await supabase
    .from("agents")
    .upsert({ pubkey }, { onConflict: "pubkey", ignoreDuplicates: true });
  if (error) throw error;
}

export async function getBalance(
  supabase: SupabaseClient,
  pubkey: string
): Promise<number> {
  const { data, error } = await supabase
    .from("agent_balances")
    .select("balance_usdc")
    .eq("pubkey", pubkey)
    .maybeSingle();
  if (error) throw error;
  if (!data) return 0;
  return Number(data.balance_usdc);
}

export async function debit(
  supabase: SupabaseClient,
  args: {
    pubkey: string;
    usdc: number;
    reason: string;
    nonce?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("credits_ledger").insert({
    agent_pubkey: args.pubkey,
    delta_usdc: -Math.abs(args.usdc),
    reason: args.reason,
    request_nonce: args.nonce ?? null,
  });
  if (error) throw error;
}

export async function credit(
  supabase: SupabaseClient,
  args: {
    pubkey: string;
    usdc: number;
    reason: string;
    tx_signature?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("credits_ledger").insert({
    agent_pubkey: args.pubkey,
    delta_usdc: Math.abs(args.usdc),
    reason: args.reason,
    tx_signature: args.tx_signature ?? null,
  });
  if (error) throw error;
}
