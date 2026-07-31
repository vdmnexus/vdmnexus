import Link from "next/link";
import { launchLive } from "@/lib/launch-flag";

type FooterLink = {
  href: string;
  label: string;
  /** External link → opens in a new tab with rel="noreferrer noopener". */
  external?: boolean;
};

/**
 * Footer IA mirrors the two-layer story: Product (what runs), Developers
 * (how to integrate), Trust & legal (/disclosures and /security are always
 * reachable here — they are the canonical disclosure surfaces and must not
 * be launch-gated), Company. /token and /whitepaper stay behind the launch
 * flag because those routes 404 until it flips.
 */
function footerGroups(showLaunch: boolean): Array<{
  title: string;
  links: FooterLink[];
}> {
  return [
    {
      title: "Product",
      links: [
        { href: "/inference", label: "Inference API" },
        { href: "/verify", label: "Verify" },
        { href: "/agents", label: "Agents" },
        { href: "/rienda", label: "Rienda" },
        { href: "/pricing", label: "Pricing" },
      ],
    },
    {
      title: "Developers",
      links: [
        { href: "https://docs.vdmnexus.com", label: "Docs", external: true },
        { href: "/sdk", label: "SDK" },
        { href: "/playground", label: "Playground" },
        { href: "/receipts", label: "Receipts" },
        { href: "/points", label: "Points" },
        {
          href: "https://github.com/vdmnexus/vdmnexus",
          label: "GitHub",
          external: true,
        },
      ],
    },
    {
      title: "Trust & legal",
      links: [
        { href: "/disclosures", label: "Disclosures" },
        { href: "/security", label: "Security" },
        {
          href: "mailto:security@vdmnexus.com",
          label: "Responsible disclosure",
          external: true,
        },
        ...(showLaunch
          ? [
              { href: "/token", label: "Token" },
              { href: "/whitepaper", label: "Whitepaper" },
            ]
          : []),
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/roadmap", label: "Roadmap" },
        { href: "/team", label: "Team" },
        { href: "/brand", label: "Brand" },
        { href: "https://x.com/vdmnexus", label: "@vdmnexus", external: true },
        { href: "https://t.me/vdmnexus", label: "Telegram", external: true },
        { href: "/#waitlist", label: "Waitlist" },
      ],
    },
  ];
}

export function Footer() {
  const groups = footerGroups(launchLive());
  return (
    <footer className="border-t border-soft">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <Link
            href="/"
            aria-label="VDM Nexus"
            className="flex items-start self-start"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="VDM Nexus" className="h-14 w-auto" />
          </Link>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {group.links.map((link) =>
                    link.external ? (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          {...(link.href.startsWith("mailto:")
                            ? {}
                            : { target: "_blank", rel: "noreferrer noopener" })}
                          className="text-text-muted transition-colors hover:text-text"
                        >
                          {link.label}
                        </a>
                      </li>
                    ) : (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-text-muted transition-colors hover:text-text"
                        >
                          {link.label}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-10 text-xs text-text-muted">© 2026 VDM Nexus</p>
      </div>
    </footer>
  );
}
