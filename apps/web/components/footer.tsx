import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-soft">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" aria-label="VDM Nexus" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VDM Nexus" className="h-8 w-auto" />
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-muted">
          <Link href="/compute" className="transition-colors hover:text-text">
            Nexus Inference
          </Link>
          <Link href="/agents" className="transition-colors hover:text-text">
            Nexus Agents
          </Link>
          <Link href="/roadmap" className="transition-colors hover:text-text">
            Roadmap
          </Link>
          <a
            href="https://x.com/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-text"
          >
            @vdmnexus
          </a>
          <a
            href="https://t.me/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-text"
          >
            Telegram
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
