import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/**
 * Redirects from "natural" top-level paths into the fumadocs `/docs/...`
 * prefix where the MDX content actually lives.
 *
 * Background: the docs site renders content at `app/docs/[[...slug]]/`,
 * which means the canonical URL for, say, the SIR v2 spec is
 * `docs.vdmnexus.com/docs/spec/sir-v2`. We'd shipped references to
 * `docs.vdmnexus.com/spec/sir-v2` (and similar) in CLAUDE.md, package
 * READMEs, the verify UI footer, marketing copy — none of which carried
 * the `/docs/` prefix. All of those 404'd in production.
 *
 * Rather than retroactively chase every external reference (some of
 * which are already in the wild on npm package READMEs, the OG tags
 * baked into receipt permalinks, etc.), we accept both URL forms and
 * 308-redirect the bare form into the canonical one. Cheap and
 * forward-compatible: any future external link that drops the `/docs/`
 * prefix still resolves.
 *
 * Note `sir-v2.schema.json` lives in `apps/docs/public/spec/` so it's
 * already served correctly at `/spec/sir-v2.schema.json` — static
 * `public/` files don't go through the rewrite layer, so the schema's
 * `$id` claim continues to resolve as expected.
 */
const docsContentPrefixes = ["spec", "sdk", "ops"];

const topLevelDocsPages = [
  "introduction",
  "why-vdm-nexus",
  "architecture",
  "quickstart",
  "first-payment",
  "verify-a-receipt",
  "signed-inference",
  "receipt-structure",
  "security",
  "agent-git",
  "faq",
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      ...docsContentPrefixes.map((prefix) => ({
        source: `/${prefix}/:path*`,
        destination: `/docs/${prefix}/:path*`,
        permanent: true,
      })),
      ...topLevelDocsPages.map((slug) => ({
        source: `/${slug}`,
        destination: `/docs/${slug}`,
        permanent: true,
      })),
    ];
  },
};

export default withMDX(config);
