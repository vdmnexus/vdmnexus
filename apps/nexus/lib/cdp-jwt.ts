/**
 * CDP API JWT signer.
 *
 * Coinbase's Secret API Keys authenticate via short-lived JWTs signed
 * with the private key. The JWT claims include the exact request URI,
 * so we mint a fresh token per (method, path) pair on every facilitator
 * call. Tokens are 120s-bound — short enough that an expired one is
 * never reused, long enough that clock skew doesn't matter.
 *
 * Format (per CDP API docs, "Authenticate using JWT"):
 *
 *   header:
 *     { alg: "ES256" | "EdDSA", kid: <key name>, typ: "JWT", nonce: <hex> }
 *   payload:
 *     { sub: <key name>, iss: "cdp", nbf: now, exp: now+120,
 *       uri: "<METHOD> <host><path>" }
 *
 * Key detection is automatic: if the PEM block starts with
 * `-----BEGIN EC PRIVATE KEY-----` or `-----BEGIN PRIVATE KEY-----`
 * containing an EC OID we sign with ES256; if it's an Ed25519 key
 * (PEM `-----BEGIN PRIVATE KEY-----` with the Ed25519 OID) we sign
 * with EdDSA. Both are accepted by the CDP API.
 */

import { SignJWT, importPKCS8, importJWK, type KeyLike } from "jose";
import { randomBytes } from "node:crypto";

type ParsedKey = {
  key: KeyLike;
  alg: "ES256" | "EdDSA";
};

let cachedKey: ParsedKey | null = null;
let cachedKeySource: string | null = null;

async function parsePrivateKey(raw: string): Promise<ParsedKey> {
  // Cache by source so we don't re-import on every JWT. Re-import only
  // if the env var changed (e.g. hot reload during local dev).
  if (cachedKey && cachedKeySource === raw) return cachedKey;

  // Vercel + many secret stores collapse newlines. Accept either real
  // newlines or `\n` escape sequences in the env var.
  const pem = raw.replace(/\\n/g, "\n").trim();

  if (pem.includes("BEGIN EC PRIVATE KEY")) {
    // SEC1 PEM — convert to PKCS#8 by wrapping. jose's importPKCS8
    // wants PKCS#8, but Coinbase historically issued SEC1. Best path:
    // ask the operator to re-paste in PKCS#8, or do an in-process
    // conversion via Node's crypto.
    throw new Error(
      "CDP_FACILITATOR_PRIVATE_KEY is SEC1 PEM (BEGIN EC PRIVATE KEY). " +
        "Re-export from CDP as PKCS#8 (BEGIN PRIVATE KEY) — Coinbase's " +
        "current Secret API Key download is already PKCS#8."
    );
  }

  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "CDP_FACILITATOR_PRIVATE_KEY does not look like a PEM block. " +
        "Expected PKCS#8 PEM starting with '-----BEGIN PRIVATE KEY-----'."
    );
  }

  // Try ES256 first (P-256), fall back to EdDSA (Ed25519). jose's
  // importPKCS8 needs the algorithm name as a hint; we attempt both
  // and use whichever succeeds.
  const errors: string[] = [];
  for (const alg of ["ES256", "EdDSA"] as const) {
    try {
      const key = await importPKCS8(pem, alg);
      const parsed: ParsedKey = { key, alg };
      cachedKey = parsed;
      cachedKeySource = raw;
      return parsed;
    } catch (e) {
      errors.push(`${alg}: ${(e as Error).message}`);
    }
  }
  throw new Error(
    "CDP_FACILITATOR_PRIVATE_KEY could not be imported as ES256 or EdDSA: " +
      errors.join("; ")
  );
}

export type CdpJwtParams = {
  /** CDP key name — full "organizations/<org>/apiKeys/<key>" form. */
  keyName: string;
  /** PKCS#8 PEM private key contents. May contain `\n` escapes. */
  privateKey: string;
  /** HTTP method of the request being authenticated. */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Host (no scheme), e.g. "api.cdp.coinbase.com". */
  host: string;
  /** Path starting with `/`. */
  path: string;
  /** Seconds the JWT is valid for. Defaults to 120 (CDP's typical window). */
  expiresInSec?: number;
};

/**
 * Mint a fresh CDP JWT for one specific (method, host, path) tuple.
 * Reuse only within the JWT's validity window (default 120s).
 */
export async function generateCdpJwt(params: CdpJwtParams): Promise<string> {
  const { key, alg } = await parsePrivateKey(params.privateKey);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (params.expiresInSec ?? 120);
  // CDP's `uri` claim includes the HTTP method, host, and path joined
  // by spaces/slashes — no scheme, no query string.
  const uri = `${params.method} ${params.host}${params.path}`;

  return new SignJWT({
    sub: params.keyName,
    iss: "cdp",
    nbf: now,
    exp,
    uri,
  })
    .setProtectedHeader({
      alg,
      kid: params.keyName,
      typ: "JWT",
      nonce: randomBytes(16).toString("hex"),
    })
    .sign(key);
}

export class CdpAuthMisconfiguredError extends Error {
  constructor(detail: string) {
    super(`CDP auth not configured: ${detail}`);
    this.name = "CdpAuthMisconfiguredError";
  }
}
