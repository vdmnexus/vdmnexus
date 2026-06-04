import Link from "next/link";
import { tournament, slugifyTeam, pct } from "@/lib/data";

export function TournamentBoard() {
  const tdata = tournament;
  const live = tdata.group_games_played > 0;
  return (
    <section
      id="board"
      className="overflow-hidden rounded-xl border border-border bg-surface scroll-mt-20"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">
          Title &amp; advancement odds
        </h2>
        <span className="text-[11px] text-slate-500">
          {tdata.n_sims.toLocaleString()} simulated tournaments ·{" "}
          {live ? (
            <span className="text-indigo-300">
              live: {tdata.group_games_played} group game
              {tdata.group_games_played === 1 ? "" : "s"} played
            </span>
          ) : (
            "pre-tournament"
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 text-left font-medium">Team</th>
              <th className="px-2 py-2 text-right font-medium">Champ</th>
              <th className="px-2 py-2 text-right font-medium">Final</th>
              <th className="px-2 py-2 text-right font-medium">Semi</th>
              <th className="px-2 py-2 text-right font-medium">Quarter</th>
              <th className="px-2 py-2 text-right font-medium">R16</th>
              <th className="px-2 py-2 text-right font-medium">Advance</th>
              <th className="px-4 py-2 text-right font-medium">Mkt · Edge</th>
            </tr>
          </thead>
          <tbody>
            {tdata.board.map((r) => (
              <tr
                key={r.team}
                className="border-t border-border hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/team/${slugifyTeam(r.team)}`}
                    className="font-medium text-slate-100 underline-offset-4 hover:text-indigo-300 hover:underline"
                  >
                    {r.team}
                  </Link>
                  <span className="ml-2 text-[11px] text-slate-500">{r.group}</span>
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-indigo-300">
                  {pct(r.champ)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-300">
                  {pct(r.final)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">
                  {pct(r.sf)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">
                  {pct(r.qf)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">
                  {pct(r.r16)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-300">
                  {pct(r.adv)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  {r.market === null ? (
                    <span className="text-slate-600">—</span>
                  ) : (
                    <>
                      <span className="text-slate-500">{pct(r.market)}</span>{" "}
                      <span
                        className={
                          (r.edge ?? 0) > 0
                            ? "text-emerald-400/90"
                            : "text-slate-500"
                        }
                      >
                        {(r.edge ?? 0) > 0 ? "+" : ""}
                        {pct(r.edge ?? 0)}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        Columns are the share of simulations in which a team reaches that stage.
        Mkt is the live Polymarket champion price; edge = model − market
        (positive in green = the model says the market underprices the team).
      </p>
    </section>
  );
}
