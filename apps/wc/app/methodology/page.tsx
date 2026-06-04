import type { Metadata } from "next";
import { scores, tournament } from "@/lib/data";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the 2026 World Cup model works: a time-weighted Dixon-Coles Poisson scoreline core, gated covariates, and Monte-Carlo tournament simulation.",
};

function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-slate-200">{children}</span>;
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
        Methodology
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">
        How the model works
      </h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-400">
        <section>
          <h2 className="text-base font-semibold text-slate-200">The core</h2>
          <p className="mt-2">
            A <Term>time-weighted Dixon-Coles Poisson</Term> model. Every
            international result is down-weighted by age, then fit to give each
            nation an attack and a defence strength plus a global home-field
            term. Those strengths turn any fixture into a full distribution over
            scorelines — not just a winner, but the probability of every{" "}
            <span className="font-mono text-slate-300">2–1</span>,{" "}
            <span className="font-mono text-slate-300">0–0</span>, and so on.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-200">
            The gate decides
          </h2>
          <p className="mt-2">
            A covariate only enters the model after it beats climatology on
            held-out <Term>Ranked Probability Score</Term>, backtested on the
            2018 and 2022 World Cups. Ingesting data is always fine; modeling
            with it is earned. Two filters decide eligibility: the feature must
            be <Term>point-in-time</Term> (snapshotted before each backtest
            tournament) and must carry signal{" "}
            <Term>beyond the rating</Term> — anything already priced in by the
            time-decay (form, rest) dies here.
          </p>
          <p className="mt-3">
            What survived and ships live: a <Term>host edge</Term>, a{" "}
            <Term>squad-talent</Term> term (the &ldquo;France blind
            spot&rdquo; — a roster more talented than recent results show), and{" "}
            <Term>travel fatigue</Term> over the 2026 venue map. Altitude, form
            and rest were tried and dropped because they failed the gate.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-200">
            From a match to a tournament
          </h2>
          <p className="mt-2">
            The scoreline engine feeds a <Term>Monte-Carlo simulation</Term> of
            the full 48-team bracket —{" "}
            {tournament.n_sims.toLocaleString()} tournaments. Group games that
            have already been played are pinned to their real results rather
            than re-simulated, so the title and advancement odds sharpen as the
            cup unfolds. The numbers on the board are simply the share of those
            simulations in which a team reaches each stage.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-200">
            The scoreline pick
          </h2>
          <p className="mt-2">
            The per-fixture <span className="font-mono text-indigo-300">PICK</span>{" "}
            is not always the single most-likely score. It maximises expected
            points under{" "}
            <span className="font-mono text-slate-300">
              {scores.scoring.exact}/{scores.scoring.gdiff}/{scores.scoring.tend}
            </span>{" "}
            prediction-pool scoring (exact score / goal difference / tendency),
            so it leans toward central scores that bank partial credit across
            tiers. When it diverges from the modal score, both are shown.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-200">Refresh</h2>
          <p className="mt-2">
            A daily job re-ingests the international-results feed, re-fits the
            ratings, pins newly played group games, and regenerates these
            snapshots. Real results dominate any covariate, so this loop is the
            single largest accuracy gain between now and the final.
          </p>
        </section>

        <p className="border-t border-border pt-6 text-xs text-slate-600">
          Generated {scores.generated_at}. Features: {scores.features}. This is
          a model, not betting advice.
        </p>
      </div>
    </main>
  );
}
