import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tracing root = monorepo root so the static `import` of the canonical
  // model snapshots in agents/polymarket/exports/ (above this app dir) is
  // traced into the standalone build.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
