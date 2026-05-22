/**
 * GET /api/stats
 *
 * Returns aggregate counters across the live agent rail:
 *   - agents       : distinct agent pubkeys with ≥1 successful inference
 *   - inferences   : total successful inferences
 *   - settled_usdc : sum of cost_usdc across successful inferences
 *   - paid_calls   : subset settled on-chain via x402 (tx_signature present)
 *
 * Backed by the SECURITY DEFINER `public.nexus_stats()` Postgres function;
 * see apps/nexus/supabase/migrations/20260522120000_nexus_stats_fn.sql.
 *
 * Cache: 60s s-maxage with 5min stale-while-revalidate. Cheap recompute,
 * but the public landing page polls this — keep CDN-friendly.
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Stats = {
  agents: number;
  inferences: number;
  settled_usdc: number;
  paid_calls: number;
  updated_at: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb.rpc("nexus_stats");

    if (error) {
      console.error("[stats] rpc error", error);
      return NextResponse.json(
        { error: "stats_unavailable" },
        { status: 500 }
      );
    }

    const raw = (data ?? {}) as Partial<Stats>;
    const body: Stats = {
      agents: Number(raw.agents ?? 0),
      inferences: Number(raw.inferences ?? 0),
      settled_usdc: Number(raw.settled_usdc ?? 0),
      paid_calls: Number(raw.paid_calls ?? 0),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    console.error("[stats] handler error", e);
    return NextResponse.json(
      { error: "stats_unavailable" },
      { status: 500 }
    );
  }
}
