import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ENTRIES = 100;
const DEFAULT_LIMIT = 30;
const MAX_LEN = 280;
const MAX_TAGS = 6;
const MAX_TAG_LEN = 32;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const parsed = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
  const limit = Math.min(
    Math.max(Number.isFinite(parsed) ? parsed : DEFAULT_LIMIT, 1),
    MAX_ENTRIES
  );

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("build_log")
    .select("id, date, entry, tags, created_at")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, entries: data ?? [] });
}

type CreateBody = {
  date?: string;
  entry?: string;
  tags?: string[];
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

  const entry = body.entry?.trim();
  if (!entry) return NextResponse.json({ ok: false, error: "missing_entry" }, { status: 400 });
  if (entry.length > MAX_LEN) {
    return NextResponse.json({ ok: false, error: "entry_too_long" }, { status: 400 });
  }

  const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date().toISOString().slice(0, 10);

  let tags: string[] | null = null;
  if (Array.isArray(body.tags)) {
    tags = body.tags
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= MAX_TAG_LEN)
      .slice(0, MAX_TAGS);
    if (tags.length === 0) tags = null;
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("build_log")
    .insert({ date, entry, tags })
    .select("id, date, entry, tags, created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, entry: data });
}
