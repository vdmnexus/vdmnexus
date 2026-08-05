import Link from "next/link";
import { launchLive } from "@/lib/launch-flag";
import { Lockup } from "@/components/mark";

type FooterLink = {
  href: string;
  label: string;
  /** External link → opens in a new tab with rel="noreferrer noopener". */
  external?: boolean;
};

/**
 * Footer IA mirrors the site story: one brand, one product.
 *
 * Rienda is the product. "Under the hood" is the signed-inference rail it
 * runs on — live, with real callers, so every route stays reachable here
 * even though it is no longer marketed as a separate product. Developers
 * carries the published packages. Trust & legal keeps /disclosures and
 * /security permanently reachable (canonical disclosure surfaces, never
 * launch-gated). /token and /whitepaper stay behind the launch flag
 * because those routes 404 until it flips.
 */
function footerGroups(showLaunch: boolean): Array<{
  title: string;
  links: FooterLink[];
}> {
  return [
    {
      title: "Rienda",
      links: [
        { href: "/rienda", label: "Overview" },
        { href: "/rienda#guardrails", label: "The ten guardrails" },
        { href: "/rienda#compute-budget", label: "Compute budget" },
        { href: "/live", label: "Live on testnet" },
        { href: "/app", label: "Vault" },
      ],
    },
    {
      title: "Under the hood",
      links: [
        { href: "/inference", label: "Signed inference" },
        { href: "/verify", label: "Verify" },
        { href: "/receipts", label: "Receipts" },
        { href: "/agents", label: "Agent directory" },
        {
          href: "https://console.vdmnexus.com",
          label: "Console",
          external: true,
        },
      ],
    },
    {
      title: "Developers",
      links: [
        { href: "https://docs.vdmnexus.com", label: "Docs", external: true },
        { href: "/sdk", label: "SDK" },
        { href: "/playground", label: "Playground" },
        { href: "/pricing", label: "Pricing" },
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
        { href: "/build", label: "Build with us" },
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
            className="flex items-start self-start text-text-muted transition-colors hover:text-text"
          >
            <Lockup markClassName="h-8 w-8" wordClassName="text-lg" />
          </Link>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
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
