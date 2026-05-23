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

/**
 * Atomic balance-check-and-debit for `/v1/inference`. Returns the
 * post-debit balance, or `null` if the agent doesn't have enough
 * credits. Calls the `public.try_debit_inference` SECURITY DEFINER
 * Postgres function, which locks the agents row so concurrent requests
 * for the same agent serialize — two simultaneous calls can no longer
 * both pass a balance check and both debit.
 *
 * Use this instead of the non-atomic `getBalance()` + `debit()` pattern
 * for any path that must enforce a hard ceiling.
 */
export async function tryDebit(
  supabase: SupabaseClient,
  args: {
    pubkey: string;
    usdc: number;
    reason: string;
    nonce?: string;
  }
): Promise<number | null> {
  const { data, error } = await supabase.rpc("try_debit_inference", {
    p_agent_pubkey: args.pubkey,
    p_amount_usdc: args.usdc,
    p_reason: args.reason,
    p_nonce: args.nonce ?? null,
  });
  if (error) throw error;
  if (data === null || data === undefined) return null;
  return Number(data);
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
