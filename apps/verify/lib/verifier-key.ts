import bs58 from "bs58";
import nacl from "tweetnacl";

const VERIFIER_SECRET_KEY_BYTES = 64;

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

let cachedKeypair: nacl.SignKeyPair | null = null;

function loadVerifierKeypair(): nacl.SignKeyPair {
  if (cachedKeypair) return cachedKeypair;
  const env = process.env.NEXUS_VERIFY_OPERATOR_SECRET_KEY?.trim();
  if (!env) {
    throw new Error(
      "NEXUS_VERIFY_OPERATOR_SECRET_KEY is required to sign verification results"
    );
  }
  const secret = bs58.decode(env);
  if (secret.length !== VERIFIER_SECRET_KEY_BYTES) {
    throw new Error(
      `NEXUS_VERIFY_OPERATOR_SECRET_KEY must decode to ${VERIFIER_SECRET_KEY_BYTES} bytes (tweetnacl secretKey format)`
    );
  }
  cachedKeypair = nacl.sign.keyPair.fromSecretKey(secret);
  return cachedKeypair;
}

export function getVerifierPublicKeyBase58(): string {
  return bs58.encode(loadVerifierKeypair().publicKey);
}

export function signResult<T extends Record<string, unknown>>(
  result: T
): T & { verifier_signature: string } {
  const payload = new TextEncoder().encode(canonicalize(result));
  const sig = nacl.sign.detached(payload, loadVerifierKeypair().secretKey);
  return { ...result, verifier_signature: bs58.encode(sig) };
}
