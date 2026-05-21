"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { launchLive } from "@/lib/launch-flag";

export function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const waitlistHref = onHome ? "#waitlist" : "/#waitlist";
  const showLaunch = launchLive();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-soft bg-bg/70 backdrop-blur">
      <nav className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label="VDM Nexus"
          className="group flex items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="VDM Nexus"
            className="h-14 w-auto md:h-16"
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink href="/inference" active={pathname === "/inference"}>
            Inference
          </NavLink>
          <NavLink href="/agents" active={pathname === "/agents"}>
            Agents
          </NavLink>
          <NavLink href="/playground" active={pathname === "/playground"}>
            Playground
          </NavLink>
          <NavLink
            href="/receipts"
            active={pathname.startsWith("/receipts") || pathname.startsWith("/r/")}
          >
            Receipts
          </NavLink>
          <NavLink href="/points" active={pathname === "/points"}>
            Points
          </NavLink>
          <NavLink href="/roadmap" active={pathname === "/roadmap"}>
            Roadmap
          </NavLink>
          {showLaunch && (
            <NavLink href="/token" active={pathname === "/token"}>
              Token
            </NavLink>
          )}
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
            href="https://t.me/vdmnexus"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="VDM Nexus on Telegram"
            className="rounded-md p-2 text-text-muted transition-colors hover:text-text"
          >
            <TelegramIcon className="h-4 w-4" />
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

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

