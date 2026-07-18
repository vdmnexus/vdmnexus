import Link from "next/link";
import { groupLetters, standingsForGroup, tournament, pct } from "@/lib/data";

function GroupTable({ group }: { group: string }) {
  const rows = standingsForGroup(group);
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold tracking-wide text-slate-300">
          Group {group}
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2 text-left font-medium">Team</th>
            <th className="px-2 py-2 text-right font-medium" title="expected points">
              xPts
            </th>
            <th className="px-2 py-2 text-right font-medium" title="expected goal difference">
              xGD
            </th>
            <th className="px-2 py-2 text-right font-medium" title="win group">
              Win grp
            </th>
            <th className="px-4 py-2 text-right font-medium" title="advance to knockouts">
              Adv
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const gd = r.xGF - r.xGA;
            return (
              <tr
                key={r.team}
                className="border-t border-border hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2">
                  <span className="mr-2 inline-block w-4 text-right font-mono text-[11px] text-slate-600">
                    {i + 1}
                  </span>
                  <Link
                    href={`/team/${r.slug}`}
                    className="font-medium text-slate-100 underline-offset-4 hover:text-indigo-300 hover:underline"
                  >
                    {r.team}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-200">
                  {r.xPts.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">
                  {gd > 0 ? "+" : ""}
                  {gd.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">
                  {pct(r.winGroup)}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-indigo-300">
                  {pct(r.adv)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function Standings() {
  const live = tournament.group_games_played > 0;
  return (
    <section id="standings" className="scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-200">
          Projected group standings
        </h2>
        <span className="text-[11px] text-slate-500">
          {live ? "live, results pinned" : "model projection · pre-tournament"}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
        Expected points and goal difference summed across each team&apos;s three
        group fixtures (from the per-match win/draw/loss and xG). Win-group and
        advance are the share of simulated tournaments. As real results land the
        same derivation tracks the live table.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {groupLetters.map((g) => (
          <GroupTable key={g} group={g} />
        ))}
      </div>
    </section>
  );
}
