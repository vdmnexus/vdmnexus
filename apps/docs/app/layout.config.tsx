import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <span className="font-semibold">VDM Nexus</span>
        <span className="ml-2 text-xs text-fd-muted-foreground">Docs</span>
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
