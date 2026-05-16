"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildLogEntry } from "@/lib/roadmap-types";

const POLL_MS = 60_000;
const DEFAULT_LIMIT = 30;
const LOAD_MORE_STEP = 30;

export function BuildLog({ initial }: { initial: BuildLogEntry[] }) {
  const [entries, setEntries] = useState<BuildLogEntry[]>(initial);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [loading, setLoading] = useState<boolean>(false);
  const knownIds = useRef<Set<string>>(new Set(initial.map((e) => e.id)));

  const fetchEntries = useCallback(async (lim: number) => {
    try {
      const res = await fetch(`/api/buildlog?limit=${lim}`, { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; entries?: BuildLogEntry[] };
      if (data.ok && data.entries) {
        knownIds.current = new Set(data.entries.map((e) => e.id));
        setEntries(data.entries);
      }
    } catch {
      // Silent — next poll will retry.
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchEntries(limit);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchEntries, limit]);

  async function loadMore() {
    const next = limit + LOAD_MORE_STEP;
    setLoading(true);
    await fetchEntries(next);
    setLimit(next);
    setLoading(false);
  }

  const canLoadMore = entries.length >= limit;

  return (
    <section
      aria-label="Build log"
      className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur"
    >
      <header className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
          Build log
        </h2>
        <span className="text-[11px] text-text-muted">live</span>
      </header>

      <ol className="space-y-4">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="border-l-2 border-accent-indigo/70 pl-4"
          >
            <p className="mb-1.5 text-xs text-text-muted">
              {formatDate(entry.date)}
            </p>
            <p className="text-sm text-text leading-relaxed">{entry.entry}</p>
            {entry.tags && entry.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>

      {canLoadMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-md border border-soft bg-surface/40 py-2 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-text-muted">No entries yet.</p>
      )}
    </section>
  );
}

function formatDate(isoDate: string): string {
  // Treat as a date-only string. Append a fixed time to avoid TZ drift.
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
