import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { RoadmapEditor } from "@/components/admin/roadmap-editor";
import { BuildLogEditor } from "@/components/admin/buildlog-editor";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { isAdmin } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/server-supabase";
import type {
  BuildLogEntry,
  PhaseWithItems,
  RoadmapItem,
  RoadmapPhase,
} from "@/lib/roadmap-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchData(): Promise<{
  phases: PhaseWithItems[];
  entries: BuildLogEntry[];
}> {
  const supabase = getServiceClient();
  const [phasesRes, itemsRes, logRes] = await Promise.all([
    supabase
      .from("roadmap_phases")
      .select("id, title, order_index, status")
      .order("order_index"),
    supabase
      .from("roadmap_items")
      .select("id, phase_id, title, status, order_index, updated_at")
      .order("order_index"),
    supabase
      .from("build_log")
      .select("id, date, entry, tags, created_at")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const phases = (phasesRes.data ?? []) as RoadmapPhase[];
  const items = (itemsRes.data ?? []) as RoadmapItem[];
  const entries = (logRes.data ?? []) as BuildLogEntry[];

  const byPhase = new Map<string, RoadmapItem[]>();
  for (const i of items) {
    const list = byPhase.get(i.phase_id) ?? [];
    list.push(i);
    byPhase.set(i.phase_id, list);
  }
  const phasesWithItems: PhaseWithItems[] = phases.map((p) => ({
    ...p,
    items: byPhase.get(p.id) ?? [],
  }));

  return { phases: phasesWithItems, entries };
}

export default async function AdminRoadmapPage() {
  if (!(await isAdmin())) {
    redirect("/admin/login?next=/admin/roadmap");
  }

  const { phases, entries } = await fetchData();

  return (
    <main className="relative min-h-screen">
      <Nav />
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Admin
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
              Roadmap &amp; build log
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Edits appear on the public <code>/roadmap</code> page within 60s.
            </p>
          </div>
          <SignOutButton />
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
              Roadmap editor
            </h2>
            <RoadmapEditor initial={phases} />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
              Build log editor
            </h2>
            <BuildLogEditor initial={entries} />
          </div>
        </div>
      </section>
    </main>
  );
}
