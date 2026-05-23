"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { launchLive } from "@/lib/launch-flag";
import { BetaPill } from "@/components/beta-pill";

type NavDropdownItem = {
  href: string;
  label: string;
  /** External link → opens in a new tab with rel="noreferrer noopener". */
  external?: boolean;
  /** One-line description shown under the label inside the dropdown panel. */
  description?: string;
};

// "Run" — for operators / consumers spending or earning on the rail.
const RUN_ITEMS: NavDropdownItem[] = [
  {
    href: "/playground",
    label: "Playground",
    description: "Try a live mainnet call",
  },
  {
    href: "/agents",
    label: "Agents",
    description: "Identity, payment, receipts",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Per-call USDC + receipt fee",
  },
];

// "Build" — for developers integrating signed inference into their products.
const BUILD_ITEMS: NavDropdownItem[] = [
  {
    href: "/sdk",
    label: "SDK",
    description: "Eight packages on npm + PyPI",
  },
  {
    href: "/inference",
    label: "Inference API",
    description: "OpenAI-compatible /chat/completions",
  },
  {
    href: "https://docs.vdmnexus.com",
    label: "Docs",
    external: true,
    description: "Quickstart, spec, ops runbooks",
  },
  {
    href: "/verify",
    label: "Verify",
    description: "Five-check receipt verifier",
  },
];

export function Nav() {
  const pathname = usePathname();
  const waitlistHref = pathname === "/" ? "#waitlist" : "/#waitlist";
  const showLaunch = launchLive();

  return <NavHeader pathname={pathname} waitlistHref={waitlistHref} showLaunch={showLaunch} />;
}

function NavHeader({
  pathname,
  waitlistHref,
  showLaunch,
}: {
  pathname: string;
  waitlistHref: string;
  showLaunch: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-soft bg-bg/70 backdrop-blur">
      <nav className="mx-auto flex h-24 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="VDM Nexus"
            className="group flex items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="VDM Nexus"
              className="h-16 w-auto md:h-20"
            />
          </Link>
          <BetaPill />
        </div>

        <div className="hidden items-center gap-7 md:flex">
          <NavDropdown label="Run" items={RUN_ITEMS} pathname={pathname} />
          <NavDropdown label="Build" items={BUILD_ITEMS} pathname={pathname} />
          <NavLink
            href="/receipts"
            active={
              pathname.startsWith("/receipts") || pathname.startsWith("/r/")
            }
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
            <NavLink href="/whitepaper" active={pathname === "/whitepaper"}>
              Whitepaper
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
          {showLaunch ? (
            <Link
              href="/token"
              className={cn(
                "rounded-md border bg-accent-indigo/20 px-3.5 py-1.5 text-xs font-semibold text-text transition-colors sm:text-sm",
                pathname === "/token"
                  ? "border-accent-indigo"
                  : "border-accent-indigo/60 hover:border-accent-indigo hover:bg-accent-indigo/30"
              )}
            >
              $NEXUS
            </Link>
          ) : (
            <a
              href={waitlistHref}
              className="rounded-md border border-soft bg-surface/60 px-3.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent-indigo/60 hover:bg-accent-indigo/10 sm:text-sm"
            >
              Join Waitlist
            </a>
          )}
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

/**
 * Hover-to-open nav dropdown with click + keyboard fallbacks.
 *
 * Click toggles, mouseEnter opens, mouseLeave closes after a 120ms grace
 * window (so moving the cursor between the trigger and the panel doesn't
 * flicker the panel shut while crossing the seam). Escape and
 * click-outside also close. The trigger reflects "active" when any item
 * in the dropdown matches the current pathname, so visiting a sub-page
 * (e.g. `/sdk`) highlights its parent ("Build") in the top nav.
 *
 * Marketing-site only — the desktop nav lives inside `hidden md:flex`.
 * Mobile doesn't render a nav at all today; if/when we add a mobile menu
 * it should not reuse this component (mobile wants accordion, not popover).
 */
function NavDropdown({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavDropdownItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = items.some(
    (i) =>
      !i.external &&
      (pathname === i.href || pathname.startsWith(i.href + "/"))
  );

  // Click-outside close — covers the case where the user opened the panel
  // via keyboard/focus and then clicks somewhere else on the page.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  function onEnter() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  }

  function onLeave() {
    // Grace window lets the cursor travel through the pt-2 spacer between
    // trigger and panel without the panel flickering closed.
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 text-sm transition-colors",
          isActive ? "text-text" : "text-text-muted hover:text-text"
        )}
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={cn(
            "h-3 w-3 transition-transform duration-150",
            open && "rotate-180"
          )}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
        >
          <div className="min-w-[220px] rounded-xl border border-soft bg-bg/95 p-1.5 shadow-xl shadow-bg/40 backdrop-blur">
            {items.map((item) => {
              const active =
                !item.external &&
                (pathname === item.href ||
                  pathname.startsWith(item.href + "/"));
              const itemClass = cn(
                "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-accent-indigo/15 text-text"
                  : "text-text hover:bg-surface/60"
              );
              const labelEl = (
                <>
                  <span className="block font-medium">
                    {item.label}
                    {item.external && (
                      <span
                        aria-hidden
                        className="ml-1.5 text-[10px] text-text-muted"
                      >
                        ↗
                      </span>
                    )}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {item.description}
                    </span>
                  )}
                </>
              );

              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    role="menuitem"
                    className={itemClass}
                    onClick={() => setOpen(false)}
                  >
                    {labelEl}
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {labelEl}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
