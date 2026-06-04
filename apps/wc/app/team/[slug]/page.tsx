import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  boardRowBySlug,
  fixturesForTeam,
  slugifyTeam,
} from "@/lib/data";
import {
  allTeamSlugs,
  positionOrder,
  squadSize,
  teamBySlug,
} from "@/lib/teams";
import { Bar } from "@/components/bar";

export function generateStaticParams() {
  return allTeamSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = teamBySlug(slug);
  if (!team) return { title: "Team not found" };
  const name = team.display ?? team.name;
  const row = boardRowBySlug(slug);
  const champ = row ? ` Champion odds ${(row.champ * 100).toFixed(1)}%.` : "";
  return {
    title: `${name} · World Cup 2026 model`,
    description: `${name} (Group ${team.group}) squad, fixtures and model projections.${champ}`,
  };
}

const odds = [
  { key: "adv", label: "Advance" },
  { key: "r16", label: "Round of 16" },
  { key: "qf", label: "Quarter-final" },
  { key: "sf", label: "Semi-final" },
  { key: "final", label: "Final" },
  { key: "champ", label: "Champion" },
] as const;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = teamBySlug(slug);
  if (!team) notFound();

  const name = team.display ?? team.name;
  const row = boardRowBySlug(slug);
  const fixtures = fixturesForTeam(team.name);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Link
        href="/#standings"
        className="text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        ← Group {team.group} · standings
      </Link>

      <header className="mt-6 rounded-xl border border-border bg-surface p-6">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">
          Group {team.group}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          {name}
        </h1>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-400">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-600">
              Manager
            </dt>
            <dd className="text-slate-200">{team.manager}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-600">
              Squad
            </dt>
            <dd className="text-slate-200">{squadSize(team)} players</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-600">
              Announced
            </dt>
            <dd className="text-slate-200">{team.announced}</dd>
          </div>
        </dl>
      </header>

      {row && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tournament projection
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {odds.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-[11px] uppercase tracking-wide text-slate-600">
                  {label}
                </dt>
                <dd
                  className={`font-mono text-lg tabular-nums ${
                    key === "champ" ? "text-indigo-300" : "text-slate-100"
                  }`}
                >
                  {(row[key] * 100).toFixed(1)}%
                </dd>
              </div>
            ))}
          </dl>
          {row.market != null && (
            <p className="mt-4 text-[11px] text-slate-500">
              Market champion price {(row.market * 100).toFixed(1)}% · model edge{" "}
              <span
                className={
                  (row.edge ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }
              >
                {(row.edge ?? 0) >= 0 ? "+" : ""}
                {((row.edge ?? 0) * 100).toFixed(1)}%
              </span>
              .
            </p>
          )}
        </section>
      )}

      {fixtures.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Group fixtures
          </h2>
          <ul className="mt-3 space-y-3">
            {fixtures.map(({ id, fixture: f }) => {
              const isHome = f.home === team.name;
              const opponent = isHome ? f.away : f.home;
              const winPct = isHome ? f.wdl[0] : f.wdl[2];
              const wdl: [number, number, number] = isHome
                ? f.wdl
                : [f.wdl[2], f.wdl[1], f.wdl[0]];
              return (
                <li key={id}>
                  <Link
                    href={`/match/${id}`}
                    className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-indigo-500/40"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-slate-300">
                        <span className="text-slate-500">
                          {isHome ? "vs" : "at"}
                        </span>{" "}
                        <span className="font-semibold text-slate-100">
                          {opponent}
                        </span>
                      </span>
                      <span className="font-mono text-lg font-bold tabular-nums text-indigo-300">
                        {isHome ? f.pick : f.pick.split("-").reverse().join("-")}
                      </span>
                    </div>
                    <div className="mt-3">
                      <Bar wdl={wdl} />
                    </div>
                    <p className="mt-2 text-[11px] tabular-nums text-slate-500">
                      {name} win {winPct}% · draw {f.wdl[1]}% · {f.city}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Squad
        </h2>
        <div className="mt-3 space-y-6">
          {positionOrder.map((pos) => (
            <div key={pos}>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {pos}
              </h3>
              <ul className="mt-2 divide-y divide-border/60">
                {team.squad[pos].map((p) => (
                  <li
                    key={`${p.name}-${p.club}`}
                    className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                  >
                    <span className="text-slate-200">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.club}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
