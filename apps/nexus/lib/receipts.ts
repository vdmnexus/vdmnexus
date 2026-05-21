/**
 * Receipt signer for apps/nexus. Delegates the canonicalize + sign logic
 * to `@vdm-nexus/paywall` so we don't fork the implementation, but keeps
 * the env-bound wrapper here: this app loads the operator secret from
 * `NEXUS_OPERATOR_SECRET_KEY`, while the package wants the secret passed
 * in explicitly (so external builders can BYO).
 */

import {
  canonicalize as canonicalizeImpl,
  signReceipt as signReceiptImpl,
  getOperatorPublicKeyBase58 as getOperatorPublicKeyBase58Impl,
} from "@vdm-nexus/paywall";

export const canonicalize = canonicalizeImpl;

function loadOperatorSecret(): string {
  const env = process.env.NEXUS_OPERATOR_SECRET_KEY?.trim();
  if (!env) {
    throw new Error("NEXUS_OPERATOR_SECRET_KEY is required to sign receipts");
  }
  return env;
}

export function getOperatorPublicKeyBase58(): string {
  return getOperatorPublicKeyBase58Impl(loadOperatorSecret());
}

export function signReceipt<T extends Record<string, unknown> & { v: 2 }>(
  receipt: T
): T & { nexus_signature: string } {
  return signReceiptImpl(receipt, loadOperatorSecret());
}
