/**
 * Receipt signer — ports `apps/nexus/lib/receipts.ts` into a portable form.
 *
 * Two changes vs the Nexus version:
 *   1. The operator secret is passed in (not read from `process.env`), so
 *      builders using `@vdm-nexus/paywall` BYO their own Ed25519 key and
 *      publish the matching pubkey wherever they like.
 *   2. The keypair is cached per-secret to avoid re-decoding base58 on
 *      every call, since a single paywall instance signs many receipts.
 *
 * The canonicalization rules and signature payload are identical, so
 * receipts emitted here verify with `@vdm-nexus/x402`'s `verifyReceipt`
 * unchanged.
 */

import bs58 from "bs58";
import nacl from "tweetnacl";
import { canonicalize as canonicalizeShared } from "@vdm-nexus/sdk";

const OPERATOR_SECRET_KEY_BYTES = 64;

// Re-export so paywall consumers keep their existing
// `import { canonicalize } from "@vdm-nexus/paywall"` lines working.
// The implementation lives in `@vdm-nexus/sdk` so paywall and x402 can't
// drift from each other — both packages reference the same bytes.
export const canonicalize = canonicalizeShared;

const keypairCache = new Map<string, nacl.SignKeyPair>();

export function loadOperatorKeypair(secretKeyBase58: string): nacl.SignKeyPair {
  const cached = keypairCache.get(secretKeyBase58);
  if (cached) return cached;
  const secret = bs58.decode(secretKeyBase58);
  if (secret.length !== OPERATOR_SECRET_KEY_BYTES) {
    throw new Error(
      `operatorSecretKey must decode to ${OPERATOR_SECRET_KEY_BYTES} bytes (tweetnacl secretKey format)`
    );
  }
  const kp = nacl.sign.keyPair.fromSecretKey(secret);
  keypairCache.set(secretKeyBase58, kp);
  return kp;
}

export function getOperatorPublicKeyBase58(secretKeyBase58: string): string {
  return bs58.encode(loadOperatorKeypair(secretKeyBase58).publicKey);
}

export function signReceipt<T extends Record<string, unknown> & { v: 2 }>(
  receipt: T,
  secretKeyBase58: string
): T & { nexus_signature: string } {
  if (receipt.v !== 2) {
    throw new Error("signReceipt requires receipt.v === 2");
  }
  const payload = new TextEncoder().encode(canonicalize(receipt));
  const sig = nacl.sign.detached(payload, loadOperatorKeypair(secretKeyBase58).secretKey);
  return { ...receipt, nexus_signature: bs58.encode(sig) };
}
