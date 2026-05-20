import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isValidPubkey } from "@/lib/solana";
import { getAgentStats } from "@/lib/points";

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

  const [agentRes, stats] = await Promise.all([
    supabase
      .from("agents")
      .select("created_at")
      .eq("pubkey", pubkey)
      .maybeSingle(),
    getAgentStats(supabase, pubkey),
  ]);

  if (!agentRes.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    pubkey,
    points_total: stats.points_total,
    first_seen_at: agentRes.data.created_at,
    last_call_at: stats.last_call_at,
    total_calls: stats.total_calls,
  });
}
