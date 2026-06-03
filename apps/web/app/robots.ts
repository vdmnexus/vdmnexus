import type { MetadataRoute } from "next";
import { launchLive, polymarketPublic } from "@/lib/launch-flag";

export default function robots(): MetadataRoute.Robots {
  const disallow: string[] = [];
  if (!launchLive()) disallow.push("/token", "/whitepaper");
  if (!polymarketPublic()) disallow.push("/agents/predictions");
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
