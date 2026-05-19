import bs58 from "bs58";
import nacl from "tweetnacl";

const OPERATOR_SECRET_KEY_BYTES = 64;

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

function loadOperatorKeypair(): nacl.SignKeyPair {
  if (cachedKeypair) return cachedKeypair;
  const env = process.env.NEXUS_OPERATOR_SECRET_KEY?.trim();
  if (!env) {
    throw new Error("NEXUS_OPERATOR_SECRET_KEY is required to sign receipts");
  }
  const secret = bs58.decode(env);
  if (secret.length !== OPERATOR_SECRET_KEY_BYTES) {
    throw new Error(
      `NEXUS_OPERATOR_SECRET_KEY must decode to ${OPERATOR_SECRET_KEY_BYTES} bytes (tweetnacl secretKey format)`
    );
  }
  cachedKeypair = nacl.sign.keyPair.fromSecretKey(secret);
  return cachedKeypair;
}

export function getOperatorPublicKeyBase58(): string {
  return bs58.encode(loadOperatorKeypair().publicKey);
}

export function signReceipt<T extends Record<string, unknown> & { v: 2 }>(
  receipt: T
): T & { nexus_signature: string } {
  if (receipt.v !== 2) {
    throw new Error("signReceipt requires receipt.v === 2");
  }
  const payload = new TextEncoder().encode(canonicalize(receipt));
  const sig = nacl.sign.detached(payload, loadOperatorKeypair().secretKey);
  return { ...receipt, nexus_signature: bs58.encode(sig) };
}
