/**
 * AWS KMS-backed Base/EVM facilitator signer (secp256k1).
 *
 * Mirrors `kms-signer.ts` (Ed25519, Solana) for secp256k1 keys. The
 * KMS key MUST be a SECG P256K1 asymmetric key
 * (KeySpec=ECC_SECG_P256K1, KeyUsage=SIGN_VERIFY); KMS signs with
 * algorithm ECDSA_SHA_256. The private key never enters lambda
 * memory — every signing op is a `KMS.Sign` round-trip.
 *
 * The signer is shaped as a viem custom account
 * (signMessage/signTypedData/signTransaction) wrapped in a
 * WalletClient + publicActions, then handed to
 * `toFacilitatorEvmSigner` from `@x402/evm`. `writeContract` /
 * `sendTransaction` inside the wallet client delegate to the
 * account's `signTransaction`, which routes the digest through KMS.
 *
 * Provisioning the KMS key (founder-side, one-time):
 *   aws kms create-key \
 *     --key-usage SIGN_VERIFY \
 *     --key-spec ECC_SECG_P256K1 \
 *     --description "Nexus Base facilitator signer"
 *   aws kms get-public-key --key-id <key-id>
 *   # → derive Ethereum address (this module does that at startup)
 *   # → fund the derived address with ETH on Base for gas
 *
 * IAM principal needs: kms:Sign + kms:GetPublicKey + kms:DescribeKey
 * scoped to the key ARN.
 */

import {
  createWalletClient,
  http,
  publicActions,
  getAddress,
  hashMessage,
  hashTypedData,
  keccak256,
  recoverAddress,
  serializeSignature,
  serializeTransaction,
  type Hex,
} from "viem";
import { toAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import {
  KMSClient,
  GetPublicKeyCommand,
  SignCommand,
  SigningAlgorithmSpec,
  MessageType,
} from "@aws-sdk/client-kms";
import {
  toFacilitatorEvmSigner,
  type FacilitatorEvmSigner,
} from "@x402/evm";
import { getEvmNetwork } from "./evm-signer";
import { log } from "./log";

// Standard SPKI DER encoding for an secp256k1 public key. 88 bytes:
//   2  bytes  SEQUENCE(86)
//   2  bytes  SEQUENCE(16)         -- AlgorithmIdentifier
//   9  bytes  OID id-ecPublicKey   (1.2.840.10045.2.1)
//   7  bytes  OID secp256k1        (1.3.132.0.10)
//   3  bytes  BIT STRING header    (03 42 00)
//   1  byte   0x04                  -- uncompressed-point indicator
//   64 bytes  X || Y
const SECP256K1_SPKI_TOTAL_LEN = 88;
const SECP256K1_SPKI_XY_OFFSET = 24;

// secp256k1 group order n.
const SECP256K1_N = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"
);
const SECP256K1_HALF_N = SECP256K1_N >> 1n;

export type KmsEvmKeyMaterial = {
  address: `0x${string}`;
  publicKeyXY: Uint8Array;
};

let cached: Promise<FacilitatorEvmSigner> | null = null;

export function getKmsEvmFacilitatorSigner(): Promise<FacilitatorEvmSigner> {
  if (cached) return cached;
  cached = build();
  return cached;
}

async function build(): Promise<FacilitatorEvmSigner> {
  const keyId = process.env.NEXUS_EVM_KMS_KEY_ID?.trim();
  if (!keyId) {
    throw new Error(
      "NEXUS_EVM_KMS_KEY_ID is required for KMS-backed EVM signing"
    );
  }
  const region = process.env.NEXUS_KMS_REGION?.trim() || "us-east-1";

  const kms = new KMSClient({ region });
  const material = await deriveEvmAddress(kms, keyId);

  log.info({
    event: "facilitator.kms_evm.derived",
    address: material.address,
  });

  const account = toAccount({
    address: material.address,
    async signMessage({ message }) {
      const hash = hashMessage(message);
      const sig = await kmsSignSecp(kms, keyId, hash, material.address);
      return serializeSignature(sig);
    },
    async signTypedData(parameters) {
      const hash = hashTypedData(parameters);
      const sig = await kmsSignSecp(kms, keyId, hash, material.address);
      return serializeSignature(sig);
    },
    async signTransaction(transaction, options) {
      const serializer = options?.serializer ?? serializeTransaction;
      const signableTx =
        transaction.type === "eip4844"
          ? { ...transaction, sidecars: false }
          : transaction;
      const unsignedHex = await serializer(
        signableTx as Parameters<typeof serializer>[0]
      );
      const hash = keccak256(unsignedHex);
      const sig = await kmsSignSecp(kms, keyId, hash, material.address);
      return serializer(transaction, sig);
    },
  });

  const network = getEvmNetwork();
  const chain = network === "base-mainnet" ? base : baseSepolia;
  const rpcUrl = process.env.NEXUS_EVM_RPC_URL?.trim();
  const transport = http(rpcUrl || undefined);

  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  }).extend(publicActions);

  return toFacilitatorEvmSigner({
    ...(walletClient as unknown as Omit<FacilitatorEvmSigner, "getAddresses">),
    address: material.address,
  });
}

export async function deriveEvmAddress(
  kms: KMSClient,
  keyId: string
): Promise<KmsEvmKeyMaterial> {
  const res = await kms.send(new GetPublicKeyCommand({ KeyId: keyId }));
  if (!res.PublicKey) {
    throw new Error(`KMS.GetPublicKey returned no public key for ${keyId}`);
  }
  return spkiToEvmAddress(new Uint8Array(res.PublicKey));
}

export function spkiToEvmAddress(spki: Uint8Array): KmsEvmKeyMaterial {
  if (spki.length !== SECP256K1_SPKI_TOTAL_LEN) {
    throw new Error(
      `Unexpected SPKI length ${spki.length} for secp256k1 ` +
        `(want ${SECP256K1_SPKI_TOTAL_LEN}) — is the KMS key SECG P256K1?`
    );
  }
  const indicator = spki[SECP256K1_SPKI_XY_OFFSET - 1];
  if (indicator !== 0x04) {
    throw new Error(
      `SPKI byte ${SECP256K1_SPKI_XY_OFFSET - 1} is not the uncompressed ` +
        `EC-point indicator (got 0x${indicator.toString(16)})`
    );
  }
  const publicKeyXY = spki.slice(SECP256K1_SPKI_XY_OFFSET);
  // Address = last 20 bytes of keccak256(X || Y), with EIP-55 checksum.
  const xyHex = ("0x" + bytesToHex(publicKeyXY)) as Hex;
  const hash = keccak256(xyHex);
  const lower = `0x${hash.slice(-40)}` as `0x${string}`;
  return { address: getAddress(lower), publicKeyXY };
}

async function kmsSignSecp(
  kms: KMSClient,
  keyId: string,
  hash: Hex,
  expectedAddress: `0x${string}`
): Promise<{ r: Hex; s: Hex; yParity: 0 | 1 }> {
  const t0 = Date.now();
  log.info({ event: "facilitator.kms_evm.sign_request" });

  let derSig: Uint8Array;
  try {
    const res = await kms.send(
      new SignCommand({
        KeyId: keyId,
        Message: hexToUint8(hash),
        MessageType: MessageType.DIGEST,
        SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
      })
    );
    if (!res.Signature) throw new Error("KMS.Sign returned no signature");
    derSig = new Uint8Array(res.Signature);
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    log.error({ event: "facilitator.kms_evm.sign_failed", error: name });
    throw err;
  }

  const { r, s } = derToRS(derSig);
  // EIP-2: only accept low-s signatures. KMS doesn't enforce this; we do.
  const normalizedS = s > SECP256K1_HALF_N ? SECP256K1_N - s : s;

  const rHex = bigintTo32ByteHex(r);
  const sHex = bigintTo32ByteHex(normalizedS);

  // secp256k1 ECDSA signatures don't encode the y-parity; recover it by
  // trying both candidates and matching against the known address.
  for (const yParity of [0, 1] as const) {
    const signature = serializeSignature({ r: rHex, s: sHex, yParity });
    const recovered = await recoverAddress({ hash, signature });
    if (recovered.toLowerCase() === expectedAddress.toLowerCase()) {
      log.info({
        event: "facilitator.kms_evm.sign_ok",
        latency_ms: Date.now() - t0,
      });
      return { r: rHex, s: sHex, yParity };
    }
  }
  log.error({ event: "facilitator.kms_evm.sign_recovery_failed" });
  throw new Error(
    "KMS signature did not recover to expected address — key mismatch?"
  );
}

export function derToRS(der: Uint8Array): { r: bigint; s: bigint } {
  let p = 0;
  if (der[p++] !== 0x30) throw new Error("DER: missing top SEQUENCE");
  // Long-form length (0x81 …) shouldn't appear for ECDSA secp256k1
  // signatures (max ~72 bytes), but parse it anyway.
  let topLen = der[p++];
  if (topLen & 0x80) {
    const lenOfLen = topLen & 0x7f;
    topLen = 0;
    for (let i = 0; i < lenOfLen; i++) topLen = (topLen << 8) | der[p++];
  }

  if (der[p++] !== 0x02) throw new Error("DER: missing r INTEGER");
  const rLen = der[p++];
  const rBytes = der.slice(p, p + rLen);
  p += rLen;

  if (der[p++] !== 0x02) throw new Error("DER: missing s INTEGER");
  const sLen = der[p++];
  const sBytes = der.slice(p, p + sLen);
  p += sLen;

  return {
    r: bytesToBigInt(rBytes),
    s: bytesToBigInt(sBytes),
  };
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  if (bytes.length === 0) return 0n;
  return BigInt("0x" + bytesToHex(bytes));
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function bigintTo32ByteHex(n: bigint): Hex {
  return `0x${n.toString(16).padStart(64, "0")}` as Hex;
}

function hexToUint8(hex: Hex): Uint8Array {
  const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (stripped.length % 2 !== 0) {
    throw new Error(`hex string has odd length: ${hex}`);
  }
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
