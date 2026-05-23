/**
 * Per-agent classification. Wired in v0 only as a typed enum that flows
 * through to the profile + dashboard renderer — the data source comes in
 * a follow-up (agent self-declares via dashboard, or supervisor classifies
 * based on call patterns). The agent profile view branches on this to
 * decide which use-case-specific stats to render.
 */
export type AgentClassification =
  | "trading"
  | "prediction-market"
  | "research"
  | "content"
  | "ops"
  | "undefined";

export function classify(_pubkey: string): AgentClassification {
  // Placeholder — every agent is "undefined" in v0. The view branches on
  // this so wiring a real classifier later is a one-call change.
  return "undefined";
}
