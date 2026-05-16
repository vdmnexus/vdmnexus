"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  nextItemStatus,
  type ItemStatus,
  type PhaseWithItems,
  type RoadmapItem,
} from "@/lib/roadmap-types";
import { cn } from "@/lib/utils";

export function RoadmapEditor({ initial }: { initial: PhaseWithItems[] }) {
  const [phases, setPhases] = useState<PhaseWithItems[]>(initial);
  const [newTitle, setNewTitle] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  function applyItemPatch(itemId: string, patch: Partial<RoadmapItem>) {
    setPhases((prev) =>
      prev.map((p) => ({
        ...p,
        items: p.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      }))
    );
  }

  async function cycleStatus(item: RoadmapItem) {
    const next = nextItemStatus(item.status);
    setBusy(item.id);
    applyItemPatch(item.id, { status: next });
    try {
      const res = await fetch(`/api/roadmap/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        applyItemPatch(item.id, { status: item.status });
      }
    } finally {
      setBusy(null);
    }
  }

  async function addItem(phaseId: string) {
    const title = (newTitle[phaseId] ?? "").trim();
    if (!title) return;
    setBusy(`add-${phaseId}`);
    try {
      const res = await fetch("/api/roadmap/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase_id: phaseId, title, status: "planned" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { item: RoadmapItem };
        setPhases((prev) =>
          prev.map((p) =>
            p.id === phaseId ? { ...p, items: [...p.items, data.item] } : p
          )
        );
        setNewTitle((t) => ({ ...t, [phaseId]: "" }));
      }
    } finally {
      setBusy(null);
    }
  }

  async function deleteItem(item: RoadmapItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setBusy(item.id);
    try {
      const res = await fetch(`/api/roadmap/items/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPhases((prev) =>
          prev.map((p) => ({
            ...p,
            items: p.items.filter((i) => i.id !== item.id),
          }))
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function move(item: RoadmapItem, direction: "up" | "down") {
    setBusy(`move-${item.id}`);
    try {
      const res = await fetch(`/api/roadmap/items/${item.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {phases.map((phase) => (
        <section
          key={phase.id}
          className="rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                Phase {phase.order_index} · {phase.status}
              </span>
              <h3 className="text-base font-semibold text-text">{phase.title}</h3>
            </div>
          </header>

          <ul className="space-y-2">
            {phase.items.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-md border border-soft/60 bg-bg/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => cycleStatus(item)}
                  disabled={busy === item.id}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors disabled:opacity-50",
                    item.status === "done" &&
                      "border-accent-indigo/60 bg-accent-indigo/15 text-text",
                    item.status === "in_progress" &&
                      "border-accent-indigo/40 bg-accent-indigo/5 text-accent-indigo",
                    item.status === "planned" &&
                      "border-soft bg-surface text-text-muted"
                  )}
                  title="Click to cycle status"
                >
                  {item.status.replace("_", " ")}
                </button>
                <span className="flex-1 text-sm text-text">{item.title}</span>
                <div className="flex items-center gap-1 text-text-muted">
                  <IconButton
                    label="Move up"
                    onClick={() => move(item, "up")}
                    disabled={idx === 0 || busy === `move-${item.id}`}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    onClick={() => move(item, "down")}
                    disabled={idx === phase.items.length - 1 || busy === `move-${item.id}`}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label="Delete"
                    onClick={() => deleteItem(item)}
                    disabled={busy === item.id}
                    danger
                  >
                    ×
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Add new item…"
              value={newTitle[phase.id] ?? ""}
              onChange={(e) =>
                setNewTitle((t) => ({ ...t, [phase.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addItem(phase.id);
                }
              }}
              className="flex-1 rounded-md border border-soft bg-bg/40 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60"
            />
            <button
              type="button"
              onClick={() => addItem(phase.id)}
              disabled={busy === `add-${phase.id}` || !((newTitle[phase.id] ?? "").trim())}
              className="rounded-md border border-accent-indigo/60 bg-accent-indigo/15 px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-accent-indigo/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md border border-soft bg-surface text-sm transition-colors hover:border-accent-indigo/60 hover:text-text",
        danger && "hover:border-red-400/60 hover:text-red-300",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-soft disabled:hover:text-text-muted"
      )}
    >
      {children}
    </button>
  );
}
