import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <span className="font-semibold">VDM Nexus</span>
        <span className="ml-2 text-xs text-fd-muted-foreground">Docs</span>
        <span
          title="Beta — API stable, mainnet live. v1 ships at $NEXUS launch."
          className="ml-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-indigo-400"
        >
          Beta
        </span>
      </>
    ),
    url: "/",
  },
  links: [
    {
      text: "Docs",
      url: "/docs/introduction",
      active: "nested-url",
    },
    {
      text: "vdmnexus.com",
      url: "https://vdmnexus.com",
      external: true,
    },
    {
      text: "GitHub",
      url: "https://github.com/vdmnexus/vdmnexus",
      external: true,
    },
  ],
};
