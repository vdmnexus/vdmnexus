import Link from "next/link";

const links = [
  { href: "/#board", label: "Odds" },
  { href: "/schedule", label: "Schedule" },
  { href: "/simulation", label: "Sim" },
  { href: "/#standings", label: "Standings" },
  { href: "/methodology", label: "Method" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent-indigo/15 text-xs font-bold text-accent-indigo ring-1 ring-accent-indigo/30">
            26
          </span>
          <span className="hidden whitespace-nowrap text-sm font-semibold tracking-tight text-text sm:inline">
            World Cup model
          </span>
        </Link>
        <div className="flex items-center gap-0.5 text-[13px] sm:gap-1 sm:text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-md px-2 py-1.5 text-text-muted transition-colors hover:text-text sm:px-2.5"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
