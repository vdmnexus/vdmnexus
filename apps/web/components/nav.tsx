"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const waitlistHref = onHome ? "#waitlist" : "/#waitlist";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-soft bg-bg/70 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label="VDM Nexus"
          className="group flex items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="VDM Nexus"
            className="h-8 w-auto md:h-9"
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink href="/compute" active={pathname === "/compute"}>
            Compute
          </NavLink>
          <NavLink href="/agents" active={pathname === "/agents"}>
            Agents
          </NavLink>
          <NavLink href="/roadmap" active={pathname === "/roadmap"}>
            Roadmap
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://x.com/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="VDM Nexus on X"
            className="rounded-md p-2 text-text-muted transition-colors hover:text-text"
          >
            <XIcon className="h-4 w-4" />
          </a>
          <a
            href={waitlistHref}
            className="rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60 hover:bg-accent-indigo/10 sm:text-sm"
          >
            Join Waitlist
          </a>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-colors",
        active ? "text-text" : "text-text-muted hover:text-text"
      )}
    >
      {children}
    </Link>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.671l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

