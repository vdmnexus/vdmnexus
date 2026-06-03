import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FadeIn } from "@/components/fade-in";
import { isAdmin } from "@/lib/admin-auth";
import scores from "./scores.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "2026 World Cup — group-stage score sheet",
  description:
    "Model-predicted exact scorelines for all 72 group-stage fixtures of the 2026 World Cup, from a calibrated Dixon-Coles core with squad-talent and travel-fatigue covariates.",
};

type Fixture = {
  home: string;
  away: string;
  city: string;
  pick: string;
  modal: string;
  ev: number;
  xg: [number, number];
  wdl: [number, number, number];
  top: [string, number][];
};

type Group = { group: string; fixtures: Fixture[] };

const data = scores as {
  generated_at: string;
  scoring: { exact: number; gdiff: number; tend: number };
  features: string;
  groups: Group[];
};

function Bar({ wdl }: { wdl: [number, number, number] }) {
  const [w, d, l] = wdl;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#1e1e2e]">
      <div className="bg-indigo-500" style={{ width: `${w}%` }} />
      <div className="bg-slate-600" style={{ width: `${d}%` }} />
      <div className="bg-blue-500/70" style={{ width: `${l}%` }} />
    </div>
  );
}

function FixtureRow({ f }: { f: Fixture }) {
  const diverges = f.pick !== f.modal;
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-[#1e1e2e] px-4 py-3 sm:grid-cols-[1fr_5rem_1fr_auto] sm:items-center">
      {/* teams + score */}
      <div className="flex items-center gap-2 text-sm sm:contents">
        <span className="font-medium text-slate-100 sm:text-right">
          {f.home}
        </span>
        <span className="mx-auto inline-flex items-center gap-2 font-mono text-base font-semibold tabular-nums text-indigo-300">
          {f.pick}
        </span>
        <span className="font-medium text-slate-100">{f.away}</span>
      </div>

      {/* meta */}
      <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:col-span-1 sm:flex sm:items-center sm:gap-3 sm:justify-self-end">
        <span className="tabular-nums">
          xg {f.xg[0].toFixed(2)}–{f.xg[1].toFixed(2)}
        </span>
        <span className="tabular-nums">
          {f.wdl[0]}/{f.wdl[1]}/{f.wdl[2]}
        </span>
        <span className="text-slate-500">{f.city}</span>
        {diverges && (
          <span className="text-amber-400/80">modal {f.modal}</span>
        )}
      </div>

      <div className="col-span-full">
        <Bar wdl={f.wdl} />
      </div>
      <div className="col-span-full flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
        {f.top.map(([s, p]) => (
          <span key={s} className="tabular-nums">
            {s}{" "}
            <span className="text-slate-600">{p.toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function WC26Page() {
  if (!(await isAdmin())) redirect("/admin/login?next=/wc26");

  return (
    <main className="min-h-screen bg-[#080810] text-slate-100">
      <Nav />
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
            2026 World Cup
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Group-stage score sheet
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
            Model-predicted exact scorelines for all 72 group fixtures. The{" "}
            <span className="font-mono text-indigo-300">PICK</span> maximises
            expected pool points under{" "}
            {data.scoring.exact}/{data.scoring.gdiff}/{data.scoring.tend}{" "}
            scoring (exact / goal-diff / tendency); it diverges from the single
            most-likely score (modal) when a central score banks more across the
            tiers. Bars show win / draw / loss.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Features: {data.features}. Generated {data.generated_at}.
          </p>
        </FadeIn>

        <div className="mt-12 space-y-8">
          {data.groups.map((g, i) => (
            <FadeIn key={g.group} delay={Math.min(i * 0.03, 0.3)}>
              <section className="overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#0e0e18]">
                <div className="border-b border-[#1e1e2e] px-4 py-3">
                  <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                    Group {g.group}
                  </h2>
                </div>
                <div>
                  {g.fixtures.map((f, j) => (
                    <FixtureRow key={`${g.group}-${j}`} f={f} />
                  ))}
                </div>
              </section>
            </FadeIn>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
