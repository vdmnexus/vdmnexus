import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PhaseCard } from "@/components/roadmap/phase-card";
import { BuildLog } from "@/components/roadmap/build-log";
import { getServiceClient } from "@/lib/server-supabase";
import type {
  BuildLogEntry,
  PhaseWithItems,
  RoadmapItem,
  RoadmapPhase,
} from "@/lib/roadmap-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roadmap — VDM Nexus",
  description:
    "Live roadmap and build log for VDM Nexus. What's shipping now, what's next, and a running record of progress.",
};

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
      .limit(30),
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

export default async function RoadmapPage() {
  const { phases, entries } = await fetchData();

  return (
    <main className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-radial-fade"
      />
      <Nav />

      <section className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-12 sm:pt-20">
        <span className="inline-block rounded-full border border-soft bg-surface/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted backdrop-blur">
          Built in public
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          Roadmap
        </h1>
        <p className="mt-4 max-w-2xl text-base text-text-muted sm:text-lg">
          What VDM Nexus is shipping, in order. The build log on the right
          updates live as new commits land.
        </p>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            {phases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} />
            ))}
          </div>

          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <BuildLog initial={entries} />
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
