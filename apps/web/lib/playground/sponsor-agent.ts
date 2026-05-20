import bs58 from "bs58";
import nacl from "tweetnacl";
import { getServiceClient } from "@/lib/server-supabase";

const DAILY_BUDGET_USDC = 5;

let cachedAgent: { secretKey: Uint8Array; pubkey: string } | null = null;

export function getSponsorAgent(): { secretKey: Uint8Array; pubkey: string } {
  if (cachedAgent) return cachedAgent;
  const raw = process.env.PLAYGROUND_AGENT_SECRET_KEY;
  if (!raw) {
    throw new Error("PLAYGROUND_AGENT_SECRET_KEY is required");
  }
  const secretKey = bs58.decode(raw);
  if (secretKey.length !== 64) {
    throw new Error(
      `PLAYGROUND_AGENT_SECRET_KEY must decode to 64 bytes, got ${secretKey.length}`
    );
  }
  const kp = nacl.sign.keyPair.fromSecretKey(secretKey);
  cachedAgent = { secretKey, pubkey: bs58.encode(kp.publicKey) };
  return cachedAgent;
}

function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function checkDailyBudget(): Promise<{
  ok: boolean;
  spent_usdc: number;
}> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("playground_daily_spend")
    .select("cost_usdc")
    .eq("utc_day", utcDay())
    .maybeSingle();
  if (error) {
    throw new Error(`checkDailyBudget: ${error.message}`);
  }
  const spent_usdc = Number(data?.cost_usdc ?? 0);
  return { ok: spent_usdc < DAILY_BUDGET_USDC, spent_usdc };
}

export async function recordSpend(usdc: number): Promise<void> {
  if (!Number.isFinite(usdc) || usdc < 0) {
    throw new Error(`recordSpend: invalid amount ${usdc}`);
  }
  const supabase = getServiceClient();
  const day = utcDay();

  // Read-modify-write upsert. The daily-budget check runs ahead of inference,
  // so a concurrent race here can only push spend slightly past the cap, never
  // silently double-count.
  const { data: existing, error: readErr } = await supabase
    .from("playground_daily_spend")
    .select("cost_usdc")
    .eq("utc_day", day)
    .maybeSingle();
  if (readErr) throw new Error(`recordSpend: ${readErr.message}`);

  const next = Number(existing?.cost_usdc ?? 0) + usdc;
  const { error: upsertErr } = await supabase
    .from("playground_daily_spend")
    .upsert({ utc_day: day, cost_usdc: next }, { onConflict: "utc_day" });
  if (upsertErr) throw new Error(`recordSpend: ${upsertErr.message}`);
}
