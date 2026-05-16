import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MoveBody = { direction?: "up" | "down" };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: MoveBody;
  try {
    body = (await req.json()) as MoveBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const direction = body.direction;
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ ok: false, error: "invalid_direction" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: self, error: selfErr } = await supabase
    .from("roadmap_items")
    .select("id, phase_id, order_index")
    .eq("id", id)
    .maybeSingle();
  if (selfErr || !self) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const cmp = direction === "up" ? "lt" : "gt";
  const order = direction === "up" ? { ascending: false } : { ascending: true };

  const { data: neighbor } = await supabase
    .from("roadmap_items")
    .select("id, order_index")
    .eq("phase_id", self.phase_id)
    .filter("order_index", cmp, self.order_index)
    .order("order_index", order)
    .limit(1)
    .maybeSingle();

  if (!neighbor) {
    return NextResponse.json({ ok: true, moved: false });
  }

  // Two-step swap via a sentinel value to dodge the per-phase order_index unique-ish read.
  // Run sequentially; admin is single-user so concurrency isn't a real concern.
  const tempIndex = -1_000_000 - Math.floor(Math.random() * 1_000_000);
  const tx1 = await supabase
    .from("roadmap_items")
    .update({ order_index: tempIndex, updated_at: new Date().toISOString() })
    .eq("id", self.id);
  if (tx1.error) {
    return NextResponse.json({ ok: false, error: tx1.error.message }, { status: 500 });
  }
  const tx2 = await supabase
    .from("roadmap_items")
    .update({ order_index: self.order_index, updated_at: new Date().toISOString() })
    .eq("id", neighbor.id);
  if (tx2.error) {
    return NextResponse.json({ ok: false, error: tx2.error.message }, { status: 500 });
  }
  const tx3 = await supabase
    .from("roadmap_items")
    .update({ order_index: neighbor.order_index, updated_at: new Date().toISOString() })
    .eq("id", self.id);
  if (tx3.error) {
    return NextResponse.json({ ok: false, error: tx3.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, moved: true });
}
