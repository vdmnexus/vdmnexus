import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isValidPubkey } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await params;
  if (!isValidPubkey(pubkey)) {
    return NextResponse.json({ error: "invalid_pubkey" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const [agentRes, statsRes] = await Promise.all([
    supabase
      .from("agents")
      .select("created_at")
      .eq("pubkey", pubkey)
      .maybeSingle(),
    supabase
      .from("inference_logs")
      .select("points.sum(), id.count(), created_at.max()")
      .eq("agent_pubkey", pubkey)
      .eq("status", "success")
      .single(),
  ]);

  if (!agentRes.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const stats = statsRes.data as
    | { sum?: number | null; count?: number | null; max?: string | null }
    | null;

  return NextResponse.json({
    pubkey,
    points_total: stats?.sum ?? 0,
    first_seen_at: agentRes.data.created_at,
    last_call_at: stats?.max ?? null,
    total_calls: stats?.count ?? 0,
  });
}
