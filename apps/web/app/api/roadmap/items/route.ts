import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { ITEM_STATUSES, type ItemStatus } from "@/lib/roadmap-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = {
  phase_id?: string;
  title?: string;
  status?: ItemStatus;
};

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const phase_id = body.phase_id?.trim();
  const title = body.title?.trim();
  const status: ItemStatus = body.status ?? "planned";

  if (!phase_id) return NextResponse.json({ ok: false, error: "missing_phase_id" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (!ITEM_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: maxRow } = await supabase
    .from("roadmap_items")
    .select("order_index")
    .eq("phase_id", phase_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.order_index ?? 0) + 1;

  const { data, error } = await supabase
    .from("roadmap_items")
    .insert({ phase_id, title, status, order_index: nextOrder })
    .select("id, phase_id, title, status, order_index, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
