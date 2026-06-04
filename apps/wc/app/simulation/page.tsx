import type { Metadata } from "next";
import Link from "next/link";
import { slugifyTeam, tournament } from "@/lib/data";

export const metadata: Metadata = {
  title: "Simulation · World Cup 2026 model",
  description:
    "What 20,000 Monte-Carlo simulations of the tournament say: champion probabilities, deep-run odds, and where the model disagrees with the market.",
};

const stages = [
  { key: "adv", label: "Adv" },
  { key: "qf", label: "QF" },
  { key: "sf", label: "SF" },
  { key: "final", label: "Final" },
  { key: "champ", label: "Win" },
] as const;

export default function SimulationPage() {
  const board = [...tournament.board];
  const byChamp = [...board].sort((a, b) => b.champ - a.champ);
  const maxChamp = byChamp[0]?.champ ?? 1;

  const withMarket = board.filter((r) => r.edge != null);
  const modelLoves = [...withMarket]
    .sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0))
    .slice(0, 5);
  const marketLoves = [...withMarket]
    .sort((a, b) => (a.edge ?? 0) - (b.edge ?? 0))
    .slice(0, 5);

  const deepRuns = byChamp.slice(0, 12);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Simulation
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          The tournament played out{" "}
          <span className="font-semibold text-slate-200">
            {tournament.n_sims.toLocaleString()}
          </span>{" "}
          times. Each run draws every match from the model&apos;s scoreline
          distribution; played group games are pinned, the rest simulated.
          Features: <span className="text-slate-500">{tournament.features}</span>.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Champion probability
        </h2>
        <ul className="mt-4 space-y-1.5">
          {byChamp.map((r, i) => (
            <li key={r.team}>
              <Link
                href={`/team/${slugifyTeam(r.team)}`}
                className="grid grid-cols-[1.5rem_8rem_1fr_3rem] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1.5rem_10rem_1fr_3.5rem]"
              >
                <span className="text-right font-mono text-xs tabular-nums text-slate-600">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-medium text-slate-100">
                  {r.team}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-indigo-500/70"
                    style={{ width: `${Math.max((r.champ / maxChamp) * 100, 1.5)}%` }}
                  />
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-indigo-300">
                  {(r.champ * 100).toFixed(1)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          How far they run
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Share of the {tournament.n_sims.toLocaleString()} sims reaching each
          stage.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 text-left font-medium">Team</th>
                {stages.map((s) => (
                  <th key={s.key} className="py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deepRuns.map((r) => (
                <tr
                  key={r.team}
                  className="border-t border-border/60 hover:bg-white/[0.02]"
                >
                  <td className="py-2">
                    <Link
                      href={`/team/${slugifyTeam(r.team)}`}
                      className="font-medium text-slate-100 hover:text-indigo-300"
                    >
                      {r.team}
                    </Link>
                    <span className="ml-1.5 text-[11px] text-slate-600">
                      {r.group}
                    </span>
                  </td>
                  {stages.map((s) => (
                    <td
                      key={s.key}
                      className={`py-2 text-right font-mono tabular-nums ${
                        s.key === "champ" ? "text-indigo-300" : "text-slate-300"
                      }`}
                    >
                      {(r[s.key] * 100).toFixed(s.key === "adv" ? 0 : 1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Model vs market
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Champion price gaps — the model&apos;s edge over the Polymarket price
          (display only, not a model input).
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/80">
              Model higher than market
            </h3>
            <ul className="mt-3 space-y-2">
              {modelLoves.map((r) => (
                <li
                  key={r.team}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/team/${slugifyTeam(r.team)}`}
                    className="font-medium text-slate-100 hover:text-indigo-300"
                  >
                    {r.team}
                  </Link>
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {(r.champ * 100).toFixed(1)}% vs {((r.market ?? 0) * 100).toFixed(1)}%{" "}
                    <span className="text-emerald-400">
                      +{((r.edge ?? 0) * 100).toFixed(1)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-rose-400/80">
              Market higher than model
            </h3>
            <ul className="mt-3 space-y-2">
              {marketLoves.map((r) => (
                <li
                  key={r.team}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/team/${slugifyTeam(r.team)}`}
                    className="font-medium text-slate-100 hover:text-indigo-300"
                  >
                    {r.team}
                  </Link>
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {(r.champ * 100).toFixed(1)}% vs {((r.market ?? 0) * 100).toFixed(1)}%{" "}
                    <span className="text-rose-400">
                      {((r.edge ?? 0) * 100).toFixed(1)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
