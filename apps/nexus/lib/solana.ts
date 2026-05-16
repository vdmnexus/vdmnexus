import bs58 from "bs58";
import nacl from "tweetnacl";

const PUBKEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

export function verifyRequestSignature(
  body: string,
  signatureBase58: string,
  pubkeyBase58: string
): boolean {
  try {
    const sig = bs58.decode(signatureBase58);
    const pub = bs58.decode(pubkeyBase58);
    if (sig.length !== SIGNATURE_BYTES || pub.length !== PUBKEY_BYTES) {
      return false;
    }
    return nacl.sign.detached.verify(
      new TextEncoder().encode(body),
      sig,
      pub
    );
  } catch {
    return false;
  }
}

export function isValidPubkey(pubkeyBase58: string): boolean {
  try {
    return bs58.decode(pubkeyBase58).length === PUBKEY_BYTES;
  } catch {
    return false;
  }
}
