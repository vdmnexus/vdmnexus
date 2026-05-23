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

import { SignJWT, importPKCS8, type KeyLike } from "jose";
import { createPrivateKey, randomBytes } from "node:crypto";

type ParsedKey = {
  key: KeyLike;
  alg: "ES256" | "EdDSA";
};

let cachedKey: ParsedKey | null = null;
let cachedKeySource: string | null = null;

/**
 * PKCS#8 prefix bytes for an Ed25519 private key. Coinbase's "Secret
 * API Key" download for Ed25519 keys is the raw 32-byte seed (base64);
 * to feed it to `jose.importPKCS8` we wrap it with this DER prefix
 * to produce a valid PKCS#8 envelope.
 *
 *   SEQUENCE(46)
 *     INTEGER 0           ; version
 *     SEQUENCE(5)
 *       OID 1.3.101.112   ; ed25519 OID
 *     OCTET STRING(34)
 *       OCTET STRING(32)  ; the seed
 */
const ED25519_PKCS8_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex"
);

function wrapEd25519SeedAsPkcs8Pem(seed: Buffer): string {
  if (seed.length !== 32) {
    throw new Error(
      `Ed25519 seed must be 32 bytes, got ${seed.length}`
    );
  }
  const der = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  const b64 = der.toString("base64");
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function normalisePemNewlines(pem: string): string {
  // Some env-var pipelines drop newlines entirely, leaving:
  //   "-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgk... -----END PRIVATE KEY-----"
  // jose's PEM decoder needs the markers on their own lines. Detect the
  // collapsed form and re-insert line breaks every 64 base64 chars.
  if (pem.split("\n").length > 3) return pem; // already multi-line
  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";
  const headerIdx = pem.indexOf(header);
  const footerIdx = pem.indexOf(footer);
  if (headerIdx === -1 || footerIdx === -1) return pem;
  const body = pem
    .slice(headerIdx + header.length, footerIdx)
    .replace(/\s+/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `${header}\n${wrapped}\n${footer}`;
}

async function parsePrivateKey(raw: string): Promise<ParsedKey> {
  if (cachedKey && cachedKeySource === raw) return cachedKey;

  // Vercel + many secret stores collapse newlines. Accept either real
  // newlines or `\n` escape sequences in the env var.
  let input = raw.replace(/\\n/g, "\n").trim();

  // Case A — operator pasted a JSON blob (e.g. the full download from
  // CDP). Extract the privateKey field.
  if (input.startsWith("{")) {
    try {
      const parsed = JSON.parse(input) as { privateKey?: string };
      if (parsed.privateKey) input = parsed.privateKey.trim();
    } catch {
      // Not JSON — fall through.
    }
  }

  // Case B — SEC1 EC PEM (legacy CDP keys). Convert to PKCS#8 via
  // Node's crypto so jose can import it.
  if (input.includes("BEGIN EC PRIVATE KEY")) {
    const keyObject = createPrivateKey({ key: input, format: "pem" });
    const pkcs8 = keyObject.export({ format: "pem", type: "pkcs8" }) as string;
    input = pkcs8;
  }

  // Case C — PKCS#8 PEM. Most common path. Repair any collapsed
  // newlines first so single-line env-var paste still works.
  if (input.includes("BEGIN PRIVATE KEY")) {
    const pem = normalisePemNewlines(input);
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
      "CDP_FACILITATOR_PRIVATE_KEY parsed as PKCS#8 PEM but failed to " +
        "import as ES256 or EdDSA: " +
        errors.join("; ")
    );
  }

  // Case D — bare base64 blob (no PEM markers). CDP often ships
  // Ed25519 seeds this way. Try wrapping as PKCS#8.
  const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(input);
  if (looksBase64) {
    let bytes: Buffer;
    try {
      bytes = Buffer.from(input.replace(/\s+/g, ""), "base64");
    } catch (e) {
      throw new Error(
        `CDP_FACILITATOR_PRIVATE_KEY looked like base64 but didn't decode: ${
          (e as Error).message
        }`
      );
    }
    // Coinbase's "Secret API Key" Ed25519 download is either the raw
    // 32-byte seed, the 64-byte seed||public concat, or the 32-byte
    // seed prefixed with a 0x04 0x20 marker. Handle the common shapes.
    let seed: Buffer | null = null;
    if (bytes.length === 32) seed = bytes;
    else if (bytes.length === 64) seed = bytes.subarray(0, 32);
    else if (bytes.length === 34 && bytes[0] === 0x04 && bytes[1] === 0x20)
      seed = bytes.subarray(2);
    if (seed) {
      const pem = wrapEd25519SeedAsPkcs8Pem(seed);
      const key = await importPKCS8(pem, "EdDSA");
      const parsed: ParsedKey = { key, alg: "EdDSA" };
      cachedKey = parsed;
      cachedKeySource = raw;
      return parsed;
    }
    throw new Error(
      `CDP_FACILITATOR_PRIVATE_KEY decoded to ${bytes.length} bytes — not ` +
        "a recognised Ed25519 seed shape (expected 32, 64, or 34 bytes). " +
        "If this is an ECDSA key, re-export from CDP as PKCS#8 PEM."
    );
  }

  throw new Error(
    "CDP_FACILITATOR_PRIVATE_KEY format not recognised. Accepted shapes: " +
      "PKCS#8 PEM (-----BEGIN PRIVATE KEY-----), SEC1 EC PEM, base64 " +
      "Ed25519 seed (32 / 64 / 34 bytes), or a JSON blob with a " +
      "`privateKey` field."
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
