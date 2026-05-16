import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { ITEM_STATUSES, type ItemStatus } from "@/lib/roadmap-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  status?: ItemStatus;
  title?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch: { status?: ItemStatus; title?: string; updated_at?: string } = {};

  if (body.status !== undefined) {
    if (!ITEM_STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ ok: false, error: "empty_title" }, { status: 400 });
    if (t.length > 200) {
      return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
    }
    patch.title = t;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("roadmap_items")
    .update(patch)
    .eq("id", id)
    .select("id, phase_id, title, status, order_index, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getServiceClient();
  const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
