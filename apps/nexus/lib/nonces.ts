import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insert a nonce row. Throws on duplicate (per-agent unique constraint).
 * Caller catches the unique-violation and treats it as a replay.
 */
export async function recordNonce(
  supabase: SupabaseClient,
  agentPubkey: string,
  nonce: string
): Promise<void> {
  const { error } = await supabase
    .from("nonces")
    .insert({ agent_pubkey: agentPubkey, nonce });
  if (error) throw error;
}
