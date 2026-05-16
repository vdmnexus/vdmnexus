import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const supabase = getServiceClient();
  const { error } = await supabase.from("build_log").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
