/**
 * GET /api/pulse
 *
 * Operational pulse for the status strip rendered across vdmnexus.com,
 * verify.vdmnexus.com, and docs.vdmnexus.com. One small payload, three
 * surfaces — same source of truth so the three subdomains can't lie to
 * each other about whether the rail is up.
 *
 * Returned fields:
 *   - status            : "live" if a mainnet receipt landed in the last
 *                         5 minutes, "degraded" if last 60 minutes,
 *                         "down" otherwise. Drives the dot color.
 *   - latest_receipt    : the most recent mainnet receipt (id + age) so
 *                         the strip can deep-link to /r/<id>
 *   - receipts_last_hour: rolling 60-minute count, mainnet only — same
 *                         "mainnet" filter as /api/recent-receipts
 *   - updated_at        : server-side timestamp; the strip uses it to
 *                         render an accurate "X seconds ago" without
 *                         drifting under HTTP cache
 *
 * CORS is wide open (Access-Control-Allow-Origin: *) — this endpoint is
 * public read-only data and the strip needs to fetch it from
 * verify.vdmnexus.com / docs.vdmnexus.com cross-origin.
 *
 * Cache: 30s s-maxage with 5min stale-while-revalidate. Cheaper than
 * /api/stats — single query, indexed lookup, mainnet-only filter.
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PulseStatus = "live" | "degraded" | "down";

type PulseBody = {
  status: PulseStatus;
  latest_receipt: {
    id: string;
    created_at: string;
  } | null;
  receipts_last_hour: number;
  updated_at: string;
};

const LIVE_THRESHOLD_MS = 5 * 60 * 1000;
const DEGRADED_THRESHOLD_MS = 60 * 60 * 1000;

// Mirror of the mainnet filter in /api/recent-receipts and the
// nexus_stats_mainnet_only migration. Devnet receipts don't count
// toward the live-rail signal — they're test traffic and would lie
// about real activity.
const MAINNET_NETWORK_FILTER = [
  "receipt_json->payment->>network.like.solana:5eykt%",
  "receipt_json->payment->>network.eq.solana:mainnet",
  "receipt_json->payment->>network.eq.eip155:8453",
].join(",");

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(): Promise<NextResponse> {
  try {
    const sb = getServiceClient();
    const now = Date.now();
    const hourAgoIso = new Date(now - DEGRADED_THRESHOLD_MS).toISOString();

    const [latestRes, countRes] = await Promise.all([
      sb
        .from("inference_logs")
        .select("id, created_at")
        .eq("status", "success")
        .not("receipt_json", "is", null)
        .not("tx_signature", "is", null)
        .or(MAINNET_NETWORK_FILTER)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("inference_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "success")
        .not("receipt_json", "is", null)
        .not("tx_signature", "is", null)
        .or(MAINNET_NETWORK_FILTER)
        .gte("created_at", hourAgoIso),
    ]);

    if (latestRes.error) {
      console.error("[pulse] latest receipt query error", latestRes.error);
      return NextResponse.json(
        { error: "pulse_unavailable" },
        { status: 500, headers: corsHeaders() }
      );
    }

    if (countRes.error) {
      console.error("[pulse] count query error", countRes.error);
      return NextResponse.json(
        { error: "pulse_unavailable" },
        { status: 500, headers: corsHeaders() }
      );
    }

    let status: PulseStatus = "down";
    let latest: PulseBody["latest_receipt"] = null;

    if (latestRes.data) {
      const createdAt = String(latestRes.data.created_at);
      const ageMs = now - new Date(createdAt).getTime();
      if (ageMs < LIVE_THRESHOLD_MS) status = "live";
      else if (ageMs < DEGRADED_THRESHOLD_MS) status = "degraded";
      latest = {
        id: String(latestRes.data.id),
        created_at: createdAt,
      };
    }

    const body: PulseBody = {
      status,
      latest_receipt: latest,
      receipts_last_hour: countRes.count ?? 0,
      updated_at: new Date(now).toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        ...corsHeaders(),
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    console.error("[pulse] handler error", e);
    return NextResponse.json(
      { error: "pulse_unavailable" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
