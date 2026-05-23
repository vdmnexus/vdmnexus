"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/sign-out", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-soft bg-surface/60 px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/40 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
