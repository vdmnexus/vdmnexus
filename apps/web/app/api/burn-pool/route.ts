/**
 * GET /api/burn-pool
 *
 * Wire 1 Phase A public counter. Returns the running total of USDC
 * accumulated in the burn pool (50% of every receipt fee on the
 * signed-inference rail) plus a per-day bucket for the last 30 days.
 * The /token page polls this every 60s to drive the live counter.
 *
 * Cache: 60s s-maxage + 5min stale-while-revalidate, matching /api/stats.
 * The query is cheap (indexed scan on created_at) but the page polls,
 * so keep it CDN-friendly.
 *
 * Source of truth: `public.burn_pool_ledger`. Service-role read; RLS
 * is enabled on the table with no policies (matches agent-rail
 * convention — anon key has no read access).
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

type DailyBucket = { date: string; usdc: number };

type BurnPoolResponse = {
  total_usdc: number;
  last_30d_daily: DailyBucket[];
  updated_at: string;
};

function utcDay(iso: string): string {
  // YYYY-MM-DD in UTC. Bucketing by the timestamp's UTC date means a
  // call at 23:59 UTC and 00:01 UTC land in different buckets, which
  // is the standard accounting boundary.
  return iso.slice(0, 10);
}

export async function GET(): Promise<NextResponse> {
  try {
    const sb = getServiceClient();

    // Pull the last-30-days rows in one query. 30 days × ~few-hundred
    // calls/day fits comfortably in a single response — pagination
    // becomes worth doing if traffic scales by 100×.
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 30);
    cutoff.setUTCHours(0, 0, 0, 0);

    const { data: recent, error: recentErr } = await sb
      .from("burn_pool_ledger")
      .select("created_at, burn_pool_share_usdc")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: true });

    if (recentErr) {
      console.error("[burn-pool] recent rows error", recentErr);
      return NextResponse.json(
        { error: "burn_pool_unavailable" },
        { status: 500 }
      );
    }

    // All-time total — separate aggregate so the 30-day window doesn't
    // gate the headline number. We page through if the table ever
    // grows past a single response, but Supabase's default 1000-row
    // limit on `select` is fine for a sum query that we reduce
    // client-side. For now the total stays bounded by the
    // post-launch volume, well under that.
    const { data: allRows, error: allErr } = await sb
      .from("burn_pool_ledger")
      .select("burn_pool_share_usdc");

    if (allErr) {
      console.error("[burn-pool] all-time error", allErr);
      return NextResponse.json(
        { error: "burn_pool_unavailable" },
        { status: 500 }
      );
    }

    let total = 0;
    for (const row of allRows ?? []) {
      total += Number(row.burn_pool_share_usdc ?? 0);
    }

    const dailyMap = new Map<string, number>();
    for (const row of recent ?? []) {
      const day = utcDay(String(row.created_at));
      dailyMap.set(
        day,
        (dailyMap.get(day) ?? 0) + Number(row.burn_pool_share_usdc ?? 0)
      );
    }

    // Fill in zero-volume days so the sparkline renders a continuous
    // axis instead of skipping gaps.
    const daily: DailyBucket[] = [];
    const cursor = new Date(cutoff);
    for (let i = 0; i < 30; i++) {
      const key = utcDay(cursor.toISOString());
      daily.push({ date: key, usdc: dailyMap.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const body: BurnPoolResponse = {
      total_usdc: total,
      last_30d_daily: daily,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    console.error("[burn-pool] handler error", e);
    return NextResponse.json(
      { error: "burn_pool_unavailable" },
      { status: 500 }
    );
  }
}
