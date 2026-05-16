import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseWithItems, ItemStatus, PhaseStatus } from "@/lib/roadmap-types";

const PHASE_BADGE: Record<PhaseStatus, string> = {
  active:
    "border-accent-indigo/60 bg-accent-indigo/15 text-text",
  upcoming:
    "border-soft bg-surface/60 text-text-muted",
  completed:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const PHASE_LABEL: Record<PhaseStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  completed: "Completed",
};

export function PhaseCard({ phase }: { phase: PhaseWithItems }) {
  const isActive = phase.status === "active";
  const isUpcoming = phase.status === "upcoming";

  return (
    <article
      className={cn(
        "relative rounded-2xl border bg-surface/60 p-6 backdrop-blur transition-colors",
        isActive
          ? "border-accent-indigo/70 shadow-[0_0_40px_-12px_rgba(99,102,241,0.45)]"
          : "border-soft",
        isUpcoming && "opacity-60"
      )}
    >
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Phase {phase.order_index}
          </span>
          <h3 className="text-lg font-semibold text-text">{phase.title}</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em]",
            PHASE_BADGE[phase.status]
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              phase.status === "active" && "bg-accent-indigo",
              phase.status === "upcoming" && "bg-text-muted",
              phase.status === "completed" && "bg-emerald-400"
            )}
          />
          {PHASE_LABEL[phase.status]}
        </span>
      </header>

      <ul className="space-y-2">
        {phase.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 text-sm text-text"
          >
            <StatusIcon status={item.status} />
            <span
              className={cn(
                item.status === "done" && "text-text-muted line-through decoration-text-muted/60",
                item.status === "planned" && "text-text-muted"
              )}
            >
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "done") {
    return (
      <span
        aria-label="Done"
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent-indigo"
      >
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span
        aria-label="In progress"
        className="grid h-4 w-4 shrink-0 place-items-center"
      >
        <span className="h-2 w-2 animate-soft-pulse rounded-full bg-accent-indigo shadow-[0_0_10px_rgba(99,102,241,0.7)]" />
      </span>
    );
  }
  return (
    <span
      aria-label="Planned"
      className="h-4 w-4 shrink-0 rounded-full border border-text-muted/50"
    />
  );
}
