import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-soft">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" aria-label="VDM Nexus" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="VDM Nexus" className="h-12 w-auto" />
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-muted">
          <a href="https://vdmnexus.com" className="transition-colors hover:text-text">
            vdmnexus.com
          </a>
          <a href="https://vdmnexus.com/agents" className="transition-colors hover:text-text">
            Agents
          </a>
          <a href="https://docs.vdmnexus.com" className="transition-colors hover:text-text">
            Docs
          </a>
          <a href="https://verify.vdmnexus.com" className="transition-colors hover:text-text">
            Verify
          </a>
          <Link href="/sign-in" className="transition-colors hover:text-text">
            Sign in
          </Link>
          <a
            href="https://x.com/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-text"
          >
            @vdmnexus
          </a>
        </nav>

        <p className="text-xs text-text-muted">© 2026 VDM Nexus</p>
      </div>
    </footer>
  );
}
