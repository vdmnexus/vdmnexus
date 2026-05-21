/**
 * GET /api/v1/receipts/recent
 *
 * Public paginated list of recent successful signed receipts. The fuel for
 * the /receipts public-index page on apps/web and for anyone building on
 * top of the receipt stream (Gitlawb commit trailers, analytics, abuse
 * monitoring, social proof).
 *
 * Query params:
 *   limit       1-100 (default 50). Total rows returned in one call.
 *   cursor      ISO timestamp from a previous page's `next_cursor`. Returns
 *               rows strictly older than the cursor — stable, deletion-safe.
 *   format      "json" (default) or "ndjson" for newline-delimited JSON.
 *               ndjson is the curl/pipe-friendly form: one receipt per line,
 *               no envelope.
 *
 * Returned fields are the hashes-only public surface. Never includes the
 * raw prompt or response text — only the sha256 hashes that live inside
 * the signed receipt itself. Aggressively edge-cached for the no-cursor
 * case (the request shape every "view recent receipts" page hits).
 */

import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type Row = {
  id: number;
  agent_pubkey: string;
  upstream: string | null;
  model: string | null;
  cost_usdc: number | null;
  latency_ms: number | null;
  tx_signature: string | null;
  receipt_json: Record<string, unknown> | null;
  created_at: string;
};

function clampLimit(raw: string | null): number {
  const n = raw ? Number(raw) : DEFAULT_LIMIT;
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = clampLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor"); // ISO timestamp
  const format = searchParams.get("format") === "ndjson" ? "ndjson" : "json";

  const supabase = getServiceClient();
  let query = supabase
    .from("inference_logs")
    .select(
      "id, agent_pubkey, upstream, model, cost_usdc, latency_ms, tx_signature, receipt_json, created_at"
    )
    .eq("status", "success")
    .not("receipt_json", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    // Strict-less-than to avoid returning the cursor row twice when ties
    // exist at the millisecond boundary.
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as Row[];

  const receipts = rows.map((r) => ({
    id: r.id,
    agent_pubkey: r.agent_pubkey,
    upstream: r.upstream,
    model: r.model,
    cost_usdc: r.cost_usdc,
    latency_ms: r.latency_ms,
    tx_signature: r.tx_signature,
    created_at: r.created_at,
    receipt: r.receipt_json,
  }));

  // Cursor points at the OLDEST row in this page; the next page asks for
  // rows older than that. `null` when fewer than `limit` rows came back —
  // the index has been exhausted.
  const next_cursor =
    receipts.length === limit
      ? receipts[receipts.length - 1]?.created_at ?? null
      : null;

  // Aggressive cache only for the no-cursor case (the front-page hit).
  // Cursored pages change less often but we don't want to pin them.
  const cacheControl = cursor
    ? "public, max-age=10, s-maxage=60"
    : "public, max-age=10, s-maxage=30";

  if (format === "ndjson") {
    const body = receipts.map((r) => JSON.stringify(r)).join("\n") + "\n";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": cacheControl,
        ...(next_cursor ? { "x-next-cursor": next_cursor } : {}),
      },
    });
  }

  return NextResponse.json(
    { ok: true, receipts, next_cursor, limit },
    {
      headers: { "cache-control": cacheControl },
    }
  );
}
