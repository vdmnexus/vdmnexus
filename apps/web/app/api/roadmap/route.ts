import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/server-supabase";
import type {
  PhaseWithItems,
  RoadmapItem,
  RoadmapPhase,
} from "@/lib/roadmap-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServiceClient();
  const [phasesRes, itemsRes] = await Promise.all([
    supabase
      .from("roadmap_phases")
      .select("id, title, order_index, status")
      .order("order_index"),
    supabase
      .from("roadmap_items")
      .select("id, phase_id, title, status, order_index, updated_at")
      .order("order_index"),
  ]);

  if (phasesRes.error) {
    return NextResponse.json(
      { ok: false, error: phasesRes.error.message },
      { status: 500 }
    );
  }
  if (itemsRes.error) {
    return NextResponse.json(
      { ok: false, error: itemsRes.error.message },
      { status: 500 }
    );
  }

  const phases = (phasesRes.data ?? []) as RoadmapPhase[];
  const items = (itemsRes.data ?? []) as RoadmapItem[];

  const byPhase = new Map<string, RoadmapItem[]>();
  for (const i of items) {
    const list = byPhase.get(i.phase_id) ?? [];
    list.push(i);
    byPhase.set(i.phase_id, list);
  }

  const result: PhaseWithItems[] = phases.map((p) => ({
    ...p,
    items: byPhase.get(p.id) ?? [],
  }));

  return NextResponse.json({ ok: true, phases: result });
}
