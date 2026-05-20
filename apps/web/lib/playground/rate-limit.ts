import { getServiceClient } from "@/lib/server-supabase";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function checkRateLimit(ipHash: string): Promise<{
  allowed: boolean;
  remaining: number;
  retry_after_ms?: number;
}> {
  const supabase = getServiceClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data: row } = await supabase
    .from("playground_rate_limit")
    .select("count, window_start")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (!row) {
    await supabase
      .from("playground_rate_limit")
      .insert({ ip_hash: ipHash, count: 1, window_start: now.toISOString() });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  const windowStart = new Date(row.window_start as string);

  if (windowStart <= cutoff) {
    await supabase
      .from("playground_rate_limit")
      .update({ count: 1, window_start: now.toISOString() })
      .eq("ip_hash", ipHash);
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  const used = row.count as number;
  if (used >= RATE_LIMIT_MAX) {
    const retry_after_ms =
      windowStart.getTime() + RATE_LIMIT_WINDOW_MS - now.getTime();
    return { allowed: false, remaining: 0, retry_after_ms };
  }

  await supabase
    .from("playground_rate_limit")
    .update({ count: used + 1 })
    .eq("ip_hash", ipHash);
  return { allowed: true, remaining: RATE_LIMIT_MAX - (used + 1) };
}
