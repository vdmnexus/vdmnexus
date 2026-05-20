/**
 * EVM facilitator signer.
 *
 * Two signing modes, selected at build time (mirrors `kms-signer.ts`
 * for SVM):
 *   - KMS  — preferred. Triggered when NEXUS_EVM_KMS_KEY_ID is set.
 *            secp256k1 private key lives in AWS KMS; only KMS.Sign
 *            round-trips touch it. Lives in `kms-signer-evm.ts`.
 *   - Env  — fallback. Reads NEXUS_EVM_PRIVATE_KEY (0x-prefixed
 *            32-byte hex). Suitable for local dev / Base Sepolia
 *            flights; never use in production.
 *
 * Callers should prefer `getEvmFacilitatorSigner()` (async, picks the
 * right mode); `buildEnvEvmFacilitatorSigner()` stays exported for
 * tests that want to exercise the env-key path directly.
 */

import { createWalletClient, http, publicActions, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import {
  toFacilitatorEvmSigner,
  type FacilitatorEvmSigner,
} from "@x402/evm";

export type EvmNetwork = "base-sepolia" | "base-mainnet";

export function getEvmNetwork(): EvmNetwork {
  const raw = process.env.NEXUS_EVM_NETWORK?.trim();
  return raw === "base-mainnet" || raw === "base" ? "base-mainnet" : "base-sepolia";
}

function parsePrivateKey(raw: string): Hex {
  const trimmed = raw.trim();
  const hex = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "NEXUS_EVM_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string (64 hex chars)"
    );
  }
  return hex as Hex;
}

export function buildEnvEvmFacilitatorSigner(): FacilitatorEvmSigner {
  const pkRaw = process.env.NEXUS_EVM_PRIVATE_KEY?.trim();
  if (!pkRaw) {
    throw new Error("NEXUS_EVM_PRIVATE_KEY is required for the EVM facilitator");
  }
  const pk = parsePrivateKey(pkRaw);
  const account = privateKeyToAccount(pk);

  const network = getEvmNetwork();
  const chain = network === "base-mainnet" ? base : baseSepolia;
  const rpcUrl = process.env.NEXUS_EVM_RPC_URL?.trim();
  const transport = http(rpcUrl || undefined);

  const walletClient = createWalletClient({ account, chain, transport }).extend(
    publicActions
  );

  // toFacilitatorEvmSigner expects an object with `address` at the top level
  // plus the viem read/write methods. Spreading the wallet client gives us
  // those methods; we then attach the account's address.
  return toFacilitatorEvmSigner({
    ...(walletClient as unknown as Omit<FacilitatorEvmSigner, "getAddresses">),
    address: account.address,
  });
}

/**
 * Returns whichever EVM signer is configured. KMS wins if both env
 * vars are set — same precedence as the SVM path.
 */
export async function getEvmFacilitatorSigner(): Promise<FacilitatorEvmSigner> {
  if (process.env.NEXUS_EVM_KMS_KEY_ID?.trim()) {
    // Imported lazily so that pure env-key deployments don't load the
    // KMS-SDK code path.
    const { getKmsEvmFacilitatorSigner } = await import("./kms-signer-evm");
    return getKmsEvmFacilitatorSigner();
  }
  return buildEnvEvmFacilitatorSigner();
}

/** True when any EVM signer (KMS or env key) is configured. */
export function isEvmConfigured(): boolean {
  return (
    !!process.env.NEXUS_EVM_KMS_KEY_ID?.trim() ||
    !!process.env.NEXUS_EVM_PRIVATE_KEY?.trim()
  );
}
