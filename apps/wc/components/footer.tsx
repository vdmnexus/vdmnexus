import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          A calibrated Dixon-Coles + Monte-Carlo model. Not betting advice.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/methodology"
            className="transition-colors hover:text-text"
          >
            Methodology
          </Link>
          <a
            href="https://vdmnexus.com"
            className="transition-colors hover:text-text"
          >
            VDM Nexus
          </a>
        </div>
      </div>
    </footer>
  );
}
