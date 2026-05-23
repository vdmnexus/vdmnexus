/**
 * Console feature flags. All default to false (fail-closed). Flip on
 * Vercel only when the underlying flow is ready for users.
 *
 * Mirrors the pattern in apps/web/lib/launch-flag.ts.
 */

/**
 * Gates the entire Mission Control sign-in + dashboard flow.
 *
 * When false:
 *   - /sign-in renders a "Mission Control sign-in is coming soon" notice
 *   - /dashboard redirects to /sign-in (which renders the same notice)
 *   - The home page hides the "Sign in" CTA and the Nav's Dashboard button
 *
 * Why this exists: Mission Control v0 shipped a sign-in flow that
 * authenticates any Solana pubkey via Ed25519 challenge-response. That
 * works for existing agents (pubkeys already in `agents` + `inference_logs`),
 * but a fresh Phantom wallet that has never made a signed call lands
 * on an empty dashboard with no way forward. The agent-creation step —
 * label, optional first-call funding, classification, etc. — needs a
 * proper design pass before sign-in is useful for non-operators.
 *
 * Until that design lands, the public profile surface (/a/[pubkey] +
 * /a/[pubkey]/erc-8004) is genuinely useful and stays live; the
 * operator-only flows get soft-gated.
 */
export function consoleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CONSOLE_AUTH_ENABLED === "true";
}
