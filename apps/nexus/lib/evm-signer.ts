/**
 * EVM facilitator signer.
 *
 * Phase 1: env-based secp256k1 key (NEXUS_EVM_PRIVATE_KEY). Sufficient
 * for Base Sepolia testnet flights. The key signs the on-chain
 * `transferWithAuthorization` call that settles each x402 payment;
 * agents only sign EIP-712 typed data (gasless from their side).
 *
 * Phase 2 (later): swap to AWS KMS with KeySpec ECC_SECG_P256K1 + an
 * ECDSA_SHA256 signing path, same way `kms-signer.ts` does for Solana
 * Ed25519. The KMS key would replace the in-memory account; the rest of
 * the viem client stays the same.
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

export function buildEvmFacilitatorSigner(): FacilitatorEvmSigner {
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
