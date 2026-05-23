/**
 * A2A-protocol alias for the ERC-8004 agent card. The EIP-8004 spec uses
 * `/.well-known/agent-registration.json`; the Google A2A protocol uses
 * `/.well-known/agent-card.json`. Both names are in active use by
 * indexers and SDKs in May 2026 — serve both so neither side has to
 * guess. Same payload, single source of truth in
 * `agent-registration.json/route.ts`.
 */

export const runtime = "nodejs";

export { GET, OPTIONS } from "../agent-registration.json/route";
