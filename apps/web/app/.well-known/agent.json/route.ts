/**
 * Generic agent-card alias. Some agent crawlers fetch the unqualified
 * /.well-known/agent.json path before falling back to the
 * EIP-8004-canonical /agent-registration.json or the A2A-protocol
 * /agent-card.json. Serve the same payload at all three so no indexer
 * has to guess which convention we follow.
 *
 * Same payload, single source of truth in
 * `agent-registration.json/route.ts`.
 */

export const runtime = "nodejs";

export { GET, OPTIONS } from "../agent-registration.json/route";
