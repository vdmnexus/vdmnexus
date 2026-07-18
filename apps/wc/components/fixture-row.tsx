import Link from "next/link";
import type { Fixture } from "@/lib/data";
import { matchId } from "@/lib/data";
import { Bar } from "./bar";

export function FixtureRow({ f, group, index }: { f: Fixture; group: string; index: number }) {
  const diverges = f.pick !== f.modal;
  return (
    <Link
      href={`/match/${matchId(group, index)}`}
      className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-border px-4 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_5rem_1fr_auto] sm:items-center"
    >
      <div className="flex items-center gap-2 text-sm sm:contents">
        <span className="font-medium text-slate-100 sm:text-right">{f.home}</span>
        <span className="mx-auto inline-flex items-center gap-2 font-mono text-base font-semibold tabular-nums text-indigo-300">
          {f.pick}
        </span>
        <span className="font-medium text-slate-100">{f.away}</span>
      </div>

      <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:col-span-1 sm:flex sm:items-center sm:gap-3 sm:justify-self-end">
        <span className="tabular-nums">
          xg {f.xg[0].toFixed(2)}–{f.xg[1].toFixed(2)}
        </span>
        <span className="tabular-nums">
          {f.wdl[0]}/{f.wdl[1]}/{f.wdl[2]}
        </span>
        <span className="text-slate-500">{f.city}</span>
        {diverges && <span className="text-amber-400/80">modal {f.modal}</span>}
      </div>

      <div className="col-span-full">
        <Bar wdl={f.wdl} />
      </div>
      <div className="col-span-full flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
        {f.top.map(([s, p]) => (
          <span key={s} className="tabular-nums">
            {s} <span className="text-slate-600">{p.toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </Link>
  );
}
