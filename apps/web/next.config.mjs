import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tracing root = monorepo root, so `outputFileTracingIncludes` can pull
  // files from outside `apps/web`. Needed for /admin/broadcasts which
  // reads markdown drafts from `marketing/broadcasts/`.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/admin/broadcasts": [
      "../../marketing/broadcasts/**/*.md",
    ],
  },
  async redirects() {
    return [
      {
        source: "/compute",
        destination: "/inference",
        permanent: true,
      },
      // The vault dashboard lives at /app. /vault is what people type.
      // Temporary, not 308 — the canonical path may still move before the
      // testnet deploy, and a cached permanent redirect is hard to walk back.
      {
        source: "/vault",
        destination: "/app",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
