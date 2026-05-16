"use client";

import { useState } from "react";
import type { BuildLogEntry } from "@/lib/roadmap-types";

const MAX_LEN = 280;

export function BuildLogEditor({ initial }: { initial: BuildLogEntry[] }) {
  const [entries, setEntries] = useState<BuildLogEntry[]>(initial);
  const [date, setDate] = useState<string>(todayISO());
  const [entry, setEntry] = useState<string>("");
  const [tagsRaw, setTagsRaw] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_LEN - entry.length;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const text = entry.trim();
    if (!text) return;
    if (text.length > MAX_LEN) {
      setError(`Too long: ${text.length}/${MAX_LEN}`);
      return;
    }
    const tags = tagsRaw
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setBusy(true);
    try {
      const res = await fetch("/api/buildlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, entry: text, tags }),
      });
      if (res.ok) {
        const data = (await res.json()) as { entry: BuildLogEntry };
        setEntries((prev) => [data.entry, ...prev]);
        setEntry("");
        setTagsRaw("");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to add entry.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/buildlog/${id}`, { method: "DELETE" });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-soft bg-bg/40 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60 sm:w-48"
          />
          <input
            type="text"
            placeholder="tags (comma or space separated)"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            className="flex-1 rounded-md border border-soft bg-bg/40 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60"
          />
        </div>
        <div className="relative">
          <textarea
            placeholder="Entry (max 280 chars)"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            rows={3}
            maxLength={MAX_LEN}
            className="w-full resize-none rounded-md border border-soft bg-bg/40 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60"
          />
          <span
            className={`absolute bottom-2 right-3 text-[11px] ${
              remaining < 0 ? "text-red-400" : "text-text-muted"
            }`}
          >
            {remaining}
          </span>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            Appears live on the public roadmap page.
          </span>
          <button
            type="submit"
            disabled={busy || !entry.trim()}
            className="rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-accent-indigo/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving..." : "Add entry"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-soft bg-surface/60 p-5 backdrop-blur">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-text-muted">
          Recent entries
        </h3>
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 border-l-2 border-accent-indigo/70 pl-4"
            >
              <div className="flex-1">
                <p className="text-xs text-text-muted">{e.date}</p>
                <p className="text-sm text-text">{e.entry}</p>
                {e.tags && e.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {e.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label="Delete entry"
                className="grid h-7 w-7 place-items-center rounded-md border border-soft bg-surface text-text-muted transition-colors hover:border-red-400/60 hover:text-red-300"
              >
                ×
              </button>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="text-sm text-text-muted">No entries yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
