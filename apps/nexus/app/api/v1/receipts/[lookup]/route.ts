/**
 * GET /api/v1/receipts/<lookup>
 *
 * Public single-receipt lookup. The <lookup> segment can be:
 *   - a numeric inference_id (e.g. "42")
 *   - a Solana tx_signature (base58, ~88 chars)
 *
 * Returns the signed receipt JSON plus a minimal set of public metadata
 * (agent pubkey, model, cost, timestamp, payment). Does NOT return the
 * prompt or response text — only the hashes that already live on the
 * receipt. Prompts may contain PII; the public surface is hash-only by
 * design. Playground receipts (which opted in to public bodies) are
 * served by the existing /r/<short_id> permalink against
 * playground_receipts.
 *
 * Accepts a trailing `.json` for curl-friendliness: /receipts/42.json
 * is equivalent to /receipts/42.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Solana tx signatures are base58-encoded 64-byte blobs → 86-88 chars.
// Permissive: 80-100 chars of base58 vocabulary.
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;

function isPositiveInteger(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) <= Number.MAX_SAFE_INTEGER;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lookup: string }> }
) {
  const raw = (await params).lookup;
  // Strip an optional .json suffix so curl users can pretend the route is
  // a static file. The rest of the resolver doesn't care.
  const lookup = raw.endsWith(".json") ? raw.slice(0, -5) : raw;

  if (!lookup) {
    return NextResponse.json(
      { ok: false, error: "missing_lookup" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  let row: {
    id: number;
    agent_pubkey: string;
    upstream: string | null;
    model: string | null;
    cost_usdc: number | null;
    latency_ms: number | null;
    status: string;
    points: number | null;
    receipt_json: Record<string, unknown> | null;
    tx_signature: string | null;
    created_at: string;
  } | null = null;

  if (isPositiveInteger(lookup)) {
    const { data, error } = await supabase
      .from("inference_logs")
      .select(
        "id, agent_pubkey, upstream, model, cost_usdc, latency_ms, status, points, receipt_json, tx_signature, created_at"
      )
      .eq("id", Number(lookup))
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    row = data;
  } else if (TX_SIGNATURE_REGEX.test(lookup)) {
    const { data, error } = await supabase
      .from("inference_logs")
      .select(
        "id, agent_pubkey, upstream, model, cost_usdc, latency_ms, status, points, receipt_json, tx_signature, created_at"
      )
      .eq("tx_signature", lookup)
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    row = data;
  } else {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_lookup",
        detail:
          "lookup must be a numeric inference_id or a Solana tx_signature (base58)",
      },
      { status: 400 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 }
    );
  }

  // Hashes-only public surface. Returning the receipt JSON exposes
  // prompt_hash + response_hash (sha256) but never the raw text.
  return NextResponse.json(
    {
      ok: true,
      id: row.id,
      agent_pubkey: row.agent_pubkey,
      upstream: row.upstream,
      model: row.model,
      cost_usdc: row.cost_usdc,
      latency_ms: row.latency_ms,
      status: row.status,
      points: row.points,
      tx_signature: row.tx_signature,
      created_at: row.created_at,
      receipt: row.receipt_json,
    },
    {
      // Receipts are immutable once signed — clients can cache forever.
      headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
    }
  );
}
