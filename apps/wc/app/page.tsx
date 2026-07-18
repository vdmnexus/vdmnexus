import { FadeIn } from "@/components/fade-in";
import { TournamentBoard } from "@/components/board";
import { Standings } from "@/components/standings";
import { FixtureRow } from "@/components/fixture-row";
import { scores, tournament } from "@/lib/data";

export default function HomePage() {
  const data = scores;

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-radial-fade" />
      <div className="relative mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
            2026 World Cup
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gradient sm:text-5xl">
            The model&apos;s World Cup
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Exact-scoreline picks for all 72 group fixtures, title and
            advancement odds for every nation, projected group tables, and
            squads — from a calibrated Dixon-Coles core with squad-talent and
            travel-fatigue covariates, over{" "}
            {tournament.n_sims.toLocaleString()} simulated tournaments.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Features: {data.features}. Generated {data.generated_at}. The{" "}
            <span className="font-mono text-indigo-300">PICK</span> maximises
            expected pool points under {data.scoring.exact}/{data.scoring.gdiff}/
            {data.scoring.tend} scoring (exact / goal-diff / tendency).
          </p>
        </FadeIn>

        <FadeIn>
          <div className="mt-12">
            <TournamentBoard />
          </div>
        </FadeIn>

        <FadeIn>
          <div className="mt-16">
            <Standings />
          </div>
        </FadeIn>

        <section id="scores" className="mt-16 scroll-mt-20">
          <h2 className="text-lg font-semibold tracking-tight text-slate-200">
            Group-stage score sheet
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
            The pick diverges from the single most-likely score (modal) when a
            central score banks more across the scoring tiers. Bars show
            win / draw / loss. Tap a fixture for the full breakdown.
          </p>
          <div className="mt-6 space-y-8">
            {data.groups.map((g, i) => (
              <FadeIn key={g.group} delay={Math.min(i * 0.03, 0.3)}>
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-300">
                      Group {g.group}
                    </h3>
                  </div>
                  <div>
                    {g.fixtures.map((f, j) => (
                      <FixtureRow key={`${g.group}-${j}`} f={f} group={g.group} index={j} />
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
