/**
 * Token launch feature flag.
 *
 * Defaults to false (fail-closed). Flip to "true" on Vercel only when the
 * token is live AND legal sign-off is in. Until then, /token and /whitepaper
 * return 404, are absent from nav/footer, and are disallowed in robots.txt.
 */
export function launchLive(): boolean {
  return process.env.NEXT_PUBLIC_LAUNCH_LIVE === "true";
}

/**
 * Polymarket public-dashboard feature flag.
 *
 * Defaults to false (fail-closed). The flagship Polymarket prediction
 * agent runs on real mainnet USDC at a small bankroll today, but the
 * public dashboard at /agents/predictions stays 404 until the founder
 * flips this flag *after* Spanish-counsel sign-off on RD 958/2020
 * art. 23.1.b (publishing reasoned bets on a named unlicensed-in-Spain
 * platform). See agents/polymarket/README.md for the full gating
 * rationale.
 *
 * Until flipped:
 *   - /agents/predictions returns 404
 *   - No nav entry pointing at it
 *   - robots.txt disallows the path
 *   - The /api/predictions read endpoint returns 404
 *   - Founder monitors via /admin/predictions (cookie-gated, unchanged)
 */
export function polymarketPublic(): boolean {
  return process.env.NEXT_PUBLIC_POLYMARKET_PUBLIC === "true";
}
