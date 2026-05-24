/**
 * No-extension alias for /.well-known/x402.json. Some indexers fetch
 * /.well-known/x402 (no extension) by convention; serve the same
 * payload either way so neither side has to guess.
 *
 * Same payload, single source of truth in `x402.json/route.ts`.
 */

export const runtime = "nodejs";

export { GET, OPTIONS } from "../x402.json/route";
