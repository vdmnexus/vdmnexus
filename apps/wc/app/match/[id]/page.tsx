import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allFixtures, fixtureById, slugifyTeam, boardRow } from "@/lib/data";
import { Bar } from "@/components/bar";
import { HeatBadge } from "@/components/heat-badge";
import { heatContext, CLIMATE_CENTRAL_URL } from "@/lib/heat";

export function generateStaticParams() {
  return allFixtures().map((f) => ({ id: f.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ref = fixtureById(id);
  if (!ref) return { title: "Match not found" };
  const { home, away } = ref.fixture;
  return {
    title: `${home} ${ref.fixture.pick} ${away}`,
    description: `Model prediction for ${home} v ${away} (Group ${ref.group}): full-time ${ref.fixture.pick}, win/draw/loss ${ref.fixture.wdl.join("/")}, xG ${ref.fixture.xg[0]}–${ref.fixture.xg[1]}.`,
  };
}

const winnerLabel = (f: { home: string; away: string; wdl: [number, number, number] }) => {
  const [w, d, l] = f.wdl;
  if (d >= w && d >= l) return { name: "Draw", conf: d };
  if (w >= l) return { name: f.home, conf: w };
  return { name: f.away, conf: l };
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ref = fixtureById(id);
  if (!ref) notFound();

  const f = ref.fixture;
  const winner = winnerLabel(f);
  const homeRow = boardRow(f.home);
  const awayRow = boardRow(f.away);
  const heat = heatContext(f.city);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Link
        href="/#scores"
        className="text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        ← Group {ref.group} · score sheet
      </Link>

      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">
            Group {ref.group} · {f.city}
          </p>
          <HeatBadge city={f.city} showTemp />
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link
            href={`/team/${slugifyTeam(f.home)}`}
            className="text-right text-lg font-semibold text-slate-100 underline-offset-4 hover:text-indigo-300 hover:underline sm:text-2xl"
          >
            {f.home}
          </Link>
          <span className="font-mono text-3xl font-bold tabular-nums text-indigo-300 sm:text-4xl">
            {f.pick}
          </span>
          <Link
            href={`/team/${slugifyTeam(f.away)}`}
            className="text-lg font-semibold text-slate-100 underline-offset-4 hover:text-indigo-300 hover:underline sm:text-2xl"
          >
            {f.away}
          </Link>
        </div>

        <div className="mt-5">
          <Bar wdl={f.wdl} />
          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-500">
            <span>
              <span className="text-indigo-400">{f.home}</span> {f.wdl[0]}%
            </span>
            <span>Draw {f.wdl[1]}%</span>
            <span>
              {f.away}{" "}
              <span className="text-blue-400/80">{f.wdl[2]}%</span>
            </span>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-400">
          Predicted full-time score{" "}
          <span className="font-mono font-semibold text-slate-100">{f.pick}</span>
          {f.pick !== f.modal && (
            <>
              {" "}
              (most-likely single score{" "}
              <span className="font-mono text-amber-400/90">{f.modal}</span>) ·{" "}
            </>
          )}
          {f.pick === f.modal && " · "}
          most-likely result{" "}
          <span className="font-semibold text-slate-100">{winner.name}</span>{" "}
          <span className="text-slate-500">({winner.conf}%)</span>.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Expected goals
          </h2>
          <div className="mt-3 flex items-baseline justify-between font-mono text-2xl tabular-nums text-slate-100">
            <span>{f.xg[0].toFixed(2)}</span>
            <span className="text-sm text-slate-600">xG</span>
            <span>{f.xg[1].toFixed(2)}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            EV of the pick under the pool scoring: {f.ev.toFixed(2)} pts.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Most-likely scorelines
          </h2>
          <ul className="mt-3 space-y-1.5">
            {f.top.map(([s, p]) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="w-10 font-mono tabular-nums text-slate-200">
                  {s}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full bg-indigo-500/70"
                    style={{ width: `${Math.min(p * 3, 100)}%` }}
                  />
                </span>
                <span className="w-10 text-right font-mono text-xs tabular-nums text-slate-500">
                  {p.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(homeRow || awayRow) && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tournament odds
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            {[
              { row: homeRow, name: f.home },
              { row: awayRow, name: f.away },
            ].map(({ row, name }) => (
              <div key={name}>
                <Link
                  href={`/team/${slugifyTeam(name)}`}
                  className="font-medium text-slate-100 hover:text-indigo-300"
                >
                  {name}
                </Link>
                {row ? (
                  <dl className="mt-2 space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <dt>Advance</dt>
                      <dd className="font-mono tabular-nums text-slate-300">
                        {(row.adv * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Champion</dt>
                      <dd className="font-mono tabular-nums text-indigo-300">
                        {(row.champ * 100).toFixed(1)}%
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-slate-600">—</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {heat && (
        <p className="mt-6 text-[11px] leading-relaxed text-slate-600">
          <span className="text-slate-500">{heat.label} venue</span> — typical
          afternoon high ~{heat.tempC}°C. This is display-only context, not a
          model input: heat was backtested both ways and failed the gate (see{" "}
          <Link
            href="/methodology"
            className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            methodology
          </Link>
          ). Venue heat analysis:{" "}
          <a
            href={CLIMATE_CENTRAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            Climate Central
          </a>
          .
        </p>
      )}
    </main>
  );
}
