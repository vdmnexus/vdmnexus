import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  boardRowBySlug,
  fixturesForTeam,
  slugifyTeam,
  teamProfileBySlug,
} from "@/lib/data";
import {
  allTeamSlugs,
  positionOrder,
  squadSize,
  teamBySlug,
  teamKnowledge,
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
  const kb = teamKnowledge(slug);
  const xg = teamProfileBySlug(slug);

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

      {xg && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recent xG form
            </h2>
            <span
              title="Fotmob expected goals over the current coach's tenure. Descriptive context — not a model input."
              className="text-[11px] tabular-nums text-slate-600"
            >
              {xg.matches} matches · {xg.confidence} confidence
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-600">
                xG for
              </dt>
              <dd className="font-mono text-lg tabular-nums text-slate-100">
                {xg.xgf?.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-600">
                xG against
              </dt>
              <dd className="font-mono text-lg tabular-nums text-slate-100">
                {xg.xga?.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-600">
                xG diff
              </dt>
              <dd
                className={`font-mono text-lg tabular-nums ${
                  (xg.xgd ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {(xg.xgd ?? 0) >= 0 ? "+" : ""}
                {xg.xgd?.toFixed(2)}
              </dd>
            </div>
          </dl>

          {xg.goals ? (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-slate-400">
              <span className="text-slate-500">Goal mix ·</span>
              <span className="tabular-nums">
                open play{" "}
                {100 -
                  (xg.setpiece_pct ?? 0) -
                  (xg.counter_pct ?? 0) -
                  (xg.penalty_pct ?? 0)}
                %
              </span>
              <span className="tabular-nums">
                set piece {xg.setpiece_pct ?? 0}%
              </span>
              <span className="tabular-nums">
                counter {xg.counter_pct ?? 0}%
              </span>
              <span className="tabular-nums">
                penalty {xg.penalty_pct ?? 0}%
              </span>
            </div>
          ) : null}

          <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
            Fotmob xG{xg.coach ? ` under ${xg.coach}` : ""}
            {xg.window === "coach"
              ? " (current-coach tenure)"
              : " (recent window — coach too new for a tenure sample)"}
            , recency-weighted. Descriptive context only — never a model input.
          </p>
        </section>
      )}

      {kb && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Scouting report
            </h2>
            {kb.updated && (
              <span className="text-[11px] tabular-nums text-slate-600">
                updated {kb.updated}
              </span>
            )}
          </div>

          {kb.summary && (
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {kb.summary}
            </p>
          )}

          {kb.style && (
            <p className="mt-3 text-[13px] text-slate-400">
              <span className="text-slate-500">Style · </span>
              {kb.style}
            </p>
          )}

          {kb.counterReliance && (
            <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-400">
              <span className="text-slate-500">Counter-reliance ·</span>
              <span
                title="Display-only 2026 scouting tag, not a model input"
                className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  kb.counterReliance.tier === "high"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : kb.counterReliance.tier === "medium"
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-300/90"
                      : "border-slate-500/25 bg-slate-500/10 text-slate-300/90"
                }`}
              >
                {kb.counterReliance.tier}
              </span>
              {kb.counterReliance.note && (
                <span className="text-slate-500">{kb.counterReliance.note}</span>
              )}
            </div>
          )}

          {(kb.strengths?.length || kb.weaknesses?.length) && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {kb.strengths?.length ? (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/80">
                    Strengths
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                    {kb.strengths.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-emerald-500/70">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {kb.weaknesses?.length ? (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-rose-400/80">
                    Weaknesses
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                    {kb.weaknesses.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-rose-500/70">−</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {kb.keyPlayers?.length ? (
            <div className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Key players
              </h3>
              <ul className="mt-2 space-y-2">
                {kb.keyPlayers.map((p) => (
                  <li key={p.name} className="text-sm">
                    <span className="font-semibold text-slate-100">
                      {p.name}
                    </span>
                    {p.role && (
                      <span className="text-slate-500"> · {p.role}</span>
                    )}
                    {p.note && (
                      <span className="block text-[13px] text-slate-400">
                        {p.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(kb.tactics || kb.mismatch || kb.xFactor) && (
            <dl className="mt-5 space-y-3">
              {kb.tactics && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Tactics
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-300">
                    {kb.tactics}
                  </dd>
                </div>
              )}
              {kb.mismatch && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Tactical mismatch
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-300">
                    {kb.mismatch}
                  </dd>
                </div>
              )}
              {kb.xFactor && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/80">
                    X-factor
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-300">
                    {kb.xFactor}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {kb.notes?.length ? (
            <div className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Notes
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-slate-400">
                {kb.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {kb.sources?.length ? (
            <p className="mt-5 text-[11px] text-slate-600">
              Sources: {kb.sources.join(" · ")}
            </p>
          ) : null}
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
