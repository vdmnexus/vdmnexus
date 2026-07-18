import type { Metadata } from "next";
import Link from "next/link";
import { scheduleByMatchday, scores } from "@/lib/data";
import { HeatBadge } from "@/components/heat-badge";

export const metadata: Metadata = {
  title: "Schedule · World Cup 2026 model",
  description:
    "Full group-stage schedule with the model's predicted full-time score for every fixture, by matchday.",
};

export default function SchedulePage() {
  const matchdays = scheduleByMatchday();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Group-stage schedule
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          All 72 group fixtures with the model&apos;s predicted full-time score.
          Tap a match for the full read. Predictions:{" "}
          <span className="text-slate-500">{scores.features}</span>.
        </p>
      </header>

      <div className="mt-10 space-y-12">
        {matchdays.map(({ matchday, fixtures }) => (
          <section key={matchday}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Matchday {matchday}
            </h2>
            <ul className="mt-3 divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface">
              {fixtures.map(({ id, group, fixture: f }) => (
                <li key={id}>
                  <Link
                    href={`/match/${id}`}
                    className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="w-5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {group}
                    </span>
                    <span className="truncate text-right text-sm font-medium text-slate-100">
                      {f.home}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-indigo-300">
                      {f.pick}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-100">
                      {f.away}
                    </span>
                    <span className="col-start-2 col-span-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                      {f.city}
                      <HeatBadge city={f.city} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
