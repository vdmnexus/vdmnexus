/**
 * Canonical JSON encoding used everywhere a Nexus signature or hash is
 * computed. Single source of truth — `@vdm-nexus/paywall` (the signer)
 * and `@vdm-nexus/x402` (the verifier) both import from here, so the
 * two sides can never drift.
 *
 * Rules (subset of RFC 8785 JCS, just enough for SIR v2):
 *   - object keys sorted lexicographically (UTF-16 code-unit order, same as
 *     `Array.prototype.sort` on strings)
 *   - no whitespace anywhere
 *   - arrays preserve order
 *   - primitives serialised via `JSON.stringify` (which handles string
 *     escaping, integer/float formatting, and `null`)
 *
 * The function is deliberately tiny and self-contained — no dependencies
 * beyond `JSON.stringify`. Re-implementing in another language (Python
 * SDK, Go, Rust) is a few-line exercise as a result.
 */

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]))
      .join(",") +
    "}"
  );
}
