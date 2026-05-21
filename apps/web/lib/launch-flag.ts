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
