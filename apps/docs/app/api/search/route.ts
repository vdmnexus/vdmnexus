/**
 * Search API for the docs. Powers the Cmd+K dialog wired through
 * `RootProvider` in app/layout.tsx — fumadocs builds an in-memory index
 * from the MDX source at build time, so no external search service is
 * needed. Lives at `/api/search` because that's where the default
 * `fumadocs-ui` client looks unless overridden.
 *
 * Returns a search index — no auth, no rate limit. Cheap, static-ish.
 */

import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createFromSource(source);
