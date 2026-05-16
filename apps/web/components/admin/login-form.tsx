"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(
        data.error === "invalid_password" ? "Wrong password." : "Login failed."
      );
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted"
        >
          Admin password
        </label>
        <input
          id="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-soft bg-surface/60 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60 focus:bg-surface"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-3 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
