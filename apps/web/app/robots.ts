import type { MetadataRoute } from "next";
import { launchLive } from "@/lib/launch-flag";

export default function robots(): MetadataRoute.Robots {
  const disallow = launchLive() ? [] : ["/token", "/whitepaper"];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    host: "https://vdmnexus.com",
  };
}
