/**
 * GET /api/recent-receipts
 *
 * Returns the most recent N successful signed receipts for the homepage
 * "recent settlements" widget. Hashes-only public surface — never includes
 * the raw prompt or response text, only the sha256 hashes (which live
 * inside the signed receipt itself anyway).
 *
 * Query params:
 *   limit  1-10, default 5. The homepage uses 5; other surfaces can ask
 *          for more but the route never returns more than 10 — anything
 *          bigger should hit /receipts (the paginated page).
 *
 * Backed by inference_logs (same source as /receipts and /r/[id]) so
 * the receipt id returned here resolves cleanly at /r/<id> with no
 * mapping layer needed.
 *
 * Cache: 30s s-maxage with 5min stale-while-revalidate. Receipts arrive
 * faster than stats — keep the freshness window tighter.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

type ReceiptCard = {
  id: string;
  agent_pubkey: string;
  model: string | null;
  cost_usdc: number | null;
  has_tx: boolean;
  network: string | null;
  created_at: string;
};

function clampLimit(raw: string | null): number {
  const n = raw ? Number(raw) : DEFAULT_LIMIT;
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

function readNetwork(r: Record<string, unknown> | null): string | null {
  if (!r) return null;
  const payment = r["payment"] as Record<string, unknown> | undefined;
  const net = payment?.["network"];
  return typeof net === "string" ? net : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const limit = clampLimit(searchParams.get("limit"));

  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("inference_logs")
      .select("id, agent_pubkey, model, cost_usdc, tx_signature, receipt_json, created_at")
      .eq("status", "success")
      .not("receipt_json", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[recent-receipts] supabase error", error);
      return NextResponse.json({ error: "unavailable" }, { status: 500 });
    }

    const receipts: ReceiptCard[] = (data ?? []).map((row) => ({
      id: String(row.id),
      agent_pubkey: row.agent_pubkey,
      model: row.model ?? null,
      cost_usdc: row.cost_usdc != null ? Number(row.cost_usdc) : null,
      has_tx: row.tx_signature != null,
      network: readNetwork(row.receipt_json as Record<string, unknown> | null),
      created_at: row.created_at,
    }));

    return NextResponse.json(
      { receipts },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("[recent-receipts] handler error", e);
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
