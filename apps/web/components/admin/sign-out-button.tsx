"use client";

export function SignOutButton() {
  async function onClick() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-soft bg-surface px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent-indigo/60 hover:text-text"
    >
      Sign out
    </button>
  );
}
