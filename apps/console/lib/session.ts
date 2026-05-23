import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CHALLENGE_COOKIE = "nexus_console_challenge";
const SESSION_COOKIE = "nexus_console_session";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * True when the env var is set and long enough to use as an HMAC key.
 * Page-level guards call this so a missing secret renders a graceful
 * notice instead of triggering a 500 from inside `sessionSecret()`.
 *
 * Defense-in-depth: `sessionSecret()` still throws if called when
 * unconfigured. That way, if a code path forgets to guard, we fail
 * closed (no half-broken auth) rather than silently signing with
 * an empty string.
 */
export function isSessionConfigured(): boolean {
  const s = process.env.CONSOLE_SESSION_SECRET;
  return typeof s === "string" && s.length >= 32;
}

function sessionSecret(): string {
  const s = process.env.CONSOLE_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "CONSOLE_SESSION_SECRET must be set to a 32+ char random string"
    );
  }
  return s;
}

function hmac(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export type Challenge = {
  nonce: string;
  expiresAt: number;
};

/**
 * Stateless challenge — random 32-byte nonce + expiry, signed with the
 * session secret and dropped in an HttpOnly cookie. The client signs the
 * nonce bytes with their agent secret; the sign-in route re-reads the
 * cookie, verifies the HMAC, then verifies the signature.
 */
export async function issueChallenge(): Promise<Challenge> {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const sig = hmac(`${nonce}.${expiresAt}`);
  const value = `${nonce}.${expiresAt}.${sig}`;
  const c = await cookies();
  c.set(CHALLENGE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
  });
  return { nonce, expiresAt };
}

export async function consumeChallenge(
  presentedNonce: string
): Promise<boolean> {
  const c = await cookies();
  const raw = c.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [nonce, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    c.delete(CHALLENGE_COOKIE);
    return false;
  }
  const expectedSig = hmac(`${nonce}.${expiresAt}`);
  if (!safeEqualHex(sig, expectedSig)) return false;
  if (nonce !== presentedNonce) return false;
  // Single-use — clear after a successful read so the same challenge
  // can't be replayed.
  c.delete(CHALLENGE_COOKIE);
  return true;
}

export async function setSessionCookie(pubkey: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sig = hmac(`${pubkey}.${expiresAt}`);
  const value = `${pubkey}.${expiresAt}.${sig}`;
  const c = await cookies();
  c.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function getSessionPubkey(): Promise<string | null> {
  // Fail closed if the HMAC key isn't configured — no session can be
  // validly signed without it, so there's no point reading the cookie.
  if (!isSessionConfigured()) return null;
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [pubkey, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const expectedSig = hmac(`${pubkey}.${expiresAt}`);
  if (!safeEqualHex(sig, expectedSig)) return null;
  return pubkey;
}
