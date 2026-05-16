"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const waitlistHref = onHome ? "#waitlist" : "/#waitlist";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-soft bg-bg/70 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold tracking-tight text-text">
            VDM Nexus
          </span>
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
            href="#"
            aria-label="GitHub"
            className="rounded-md p-2 text-text-muted transition-colors hover:text-text"
          >
            <Github className="h-4 w-4" />
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

function Logo() {
  return (
    <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md border border-soft bg-surface">
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-accent-indigo/30 to-accent-blue/10"
      />
      <span className="relative text-[11px] font-bold tracking-tighter text-text">
        N
      </span>
    </span>
  );
}
