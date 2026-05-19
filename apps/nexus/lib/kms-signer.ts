/**
 * AWS KMS-backed Solana facilitator signer.
 *
 * Implements the @x402/svm `FacilitatorSvmSigner` interface, but the
 * private key never leaves AWS KMS — every signing op is a `KMS.Sign`
 * round-trip. Used by `local-facilitator.ts` whenever
 * `NEXUS_KMS_KEY_ID` is set; the env-var keypair path stays as a dev
 * fallback.
 *
 * Devnet only in this build. Mainnet is gated by a separate roadmap
 * item.
 */

import bs58 from "bs58";
import {
  address,
  getBase64Encoder,
  getTransactionDecoder,
  getBase64EncodedWireTransaction,
  type Address,
  type Base64EncodedWireTransaction,
  type Signature,
  type SignatureBytes,
} from "@solana/kit";
import { createRpcClient, type FacilitatorSvmSigner } from "@x402/svm";
import {
  KMSClient,
  GetPublicKeyCommand,
  SignCommand,
  SigningAlgorithmSpec,
  MessageType,
} from "@aws-sdk/client-kms";
import { log } from "./log";

// SPKI DER prefix for an Ed25519 public key — 12 fixed bytes, then 32
// bytes of raw key. See RFC 8410 §4.
const ED25519_SPKI_PREFIX_LEN = 12;

type KmsKeyMaterial = {
  address: Address;
  publicKeyBytes: Uint8Array;
};

let cached: Promise<FacilitatorSvmSigner> | null = null;

export function getKmsFacilitatorSigner(): Promise<FacilitatorSvmSigner> {
  if (cached) return cached;
  cached = build();
  return cached;
}

async function build(): Promise<FacilitatorSvmSigner> {
  const keyId = process.env.NEXUS_KMS_KEY_ID?.trim();
  if (!keyId) {
    throw new Error("NEXUS_KMS_KEY_ID is required for KMS-backed signing");
  }
  const region = process.env.NEXUS_KMS_REGION?.trim() || "us-east-1";

  const kms = new KMSClient({ region });
  const material = await deriveAddress(kms, keyId);

  const customRpcUrl = process.env.SOLANA_RPC_URL?.trim() || undefined;

  // The signer interface types `network` as plain string; createRpcClient
  // expects the CAIP-2 `${string}:${string}` form. Callers always pass a
  // CAIP-2 value coming from PaymentRequirements, so cast at the boundary.
  const rpcFor = (network: string) =>
    createRpcClient(network as `${string}:${string}`, customRpcUrl);

  return {
    getAddresses: () => [material.address],

    signTransaction: async (transaction, feePayer, _network) => {
      if (feePayer !== material.address) {
        throw new Error(
          `KMS signer has no key for feePayer ${feePayer} (only ${material.address})`
        );
      }
      const t0 = Date.now();
      log.info({
        event: "facilitator.kms.sign_request",
        feePayer,
      });

      const txBytes = getBase64Encoder().encode(transaction);
      const tx = getTransactionDecoder().decode(txBytes);

      let signatureBytes: SignatureBytes;
      try {
        signatureBytes = await kmsSign(
          kms,
          keyId,
          new Uint8Array(tx.messageBytes)
        );
      } catch (err) {
        const name = err instanceof Error ? err.name : "unknown";
        log.error({ event: "facilitator.kms.sign_failed", error: name });
        throw err;
      }

      const signedTx = {
        ...tx,
        signatures: {
          ...tx.signatures,
          [material.address]: signatureBytes,
        },
      };
      const out = getBase64EncodedWireTransaction(signedTx);

      log.info({
        event: "facilitator.kms.sign_ok",
        latency_ms: Date.now() - t0,
      });
      return out;
    },

    simulateTransaction: async (transaction, network) => {
      const rpc = rpcFor(network);
      const result = await rpc
        .simulateTransaction(transaction as Base64EncodedWireTransaction, {
          sigVerify: true,
          replaceRecentBlockhash: false,
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();
      if (result.value.err) {
        const errStr = JSON.stringify(result.value.err, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        );
        throw new Error(`Simulation failed: ${errStr}`);
      }
    },

    sendTransaction: async (transaction, network) => {
      const rpc = rpcFor(network);
      return await rpc
        .sendTransaction(transaction as Base64EncodedWireTransaction, {
          encoding: "base64",
        })
        .send();
    },

    confirmTransaction: async (signature, network) => {
      const rpc = rpcFor(network);
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const status = await rpc
          .getSignatureStatuses([signature as Signature])
          .send();
        const entry = status.value[0];
        if (entry?.err) {
          throw new Error(
            `Transaction failed: ${JSON.stringify(entry.err)}`
          );
        }
        if (
          entry?.confirmationStatus === "confirmed" ||
          entry?.confirmationStatus === "finalized"
        ) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw new Error(`Transaction confirmation timeout: ${signature}`);
    },
  };
}

async function deriveAddress(
  kms: KMSClient,
  keyId: string
): Promise<KmsKeyMaterial> {
  const res = await kms.send(new GetPublicKeyCommand({ KeyId: keyId }));
  if (!res.PublicKey) {
    throw new Error(`KMS.GetPublicKey returned no public key for ${keyId}`);
  }
  const spki = new Uint8Array(res.PublicKey);
  if (spki.length !== ED25519_SPKI_PREFIX_LEN + 32) {
    throw new Error(
      `Unexpected SPKI length ${spki.length} for Ed25519 (want ${
        ED25519_SPKI_PREFIX_LEN + 32
      }) — is the KMS key Ed25519?`
    );
  }
  const raw = spki.slice(ED25519_SPKI_PREFIX_LEN);
  const addr = address(bs58.encode(raw));
  return { address: addr, publicKeyBytes: raw };
}

async function kmsSign(
  kms: KMSClient,
  keyId: string,
  message: Uint8Array
): Promise<SignatureBytes> {
  const res = await kms.send(
    new SignCommand({
      KeyId: keyId,
      Message: message,
      MessageType: MessageType.RAW,
      SigningAlgorithm: SigningAlgorithmSpec.ED25519_SHA_512,
    })
  );
  if (!res.Signature) {
    throw new Error("KMS.Sign returned no signature");
  }
  const sig = new Uint8Array(res.Signature);
  if (sig.length !== 64) {
    throw new Error(
      `KMS.Sign returned ${sig.length}-byte signature, want 64`
    );
  }
  return sig as SignatureBytes;
}
