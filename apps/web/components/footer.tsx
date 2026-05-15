import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-soft">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md border border-soft bg-surface">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-accent-indigo/30 to-accent-blue/10"
            />
            <span className="relative text-[11px] font-bold tracking-tighter text-text">
              N
            </span>
          </span>
          <span className="text-sm font-semibold tracking-tight text-text">
            VDM Nexus
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-muted">
          <Link href="/compute" className="transition-colors hover:text-text">
            Nexus Compute
          </Link>
          <Link href="/agents" className="transition-colors hover:text-text">
            Nexus Agents
          </Link>
          <a href="#" className="transition-colors hover:text-text">
            GitHub
          </a>
          <Link href="/#waitlist" className="transition-colors hover:text-text">
            Waitlist
          </Link>
        </nav>

        <p className="text-xs text-text-muted">© 2026 VDM Nexus</p>
      </div>
    </footer>
  );
}
