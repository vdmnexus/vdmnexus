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
    ];
  },
};

export default nextConfig;
