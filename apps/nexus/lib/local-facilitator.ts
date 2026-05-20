/**
 * Self-hosted x402 facilitator — verifies and settles signed payments
 * across multiple chains in a single process.
 *
 * Solana (SVM) is always registered when NEXUS_KMS_KEY_ID or
 * NEXUS_DEPOSIT_SECRET_KEY is set. Base (EVM) is *additionally*
 * registered when NEXUS_EVM_PRIVATE_KEY is set. Both schemes live on
 * one x402Facilitator instance; the route picks which network to
 * advertise per challenge.
 *
 * Solana signing modes:
 *   - KMS    — preferred. Triggered when NEXUS_KMS_KEY_ID is set.
 *              The Ed25519 private key lives in AWS KMS; only KMS.Sign
 *              round-trips touch it. Fee-payer address is derived from
 *              KMS.GetPublicKey at startup and asserted to match
 *              NEXUS_DEPOSIT_ADDRESS.
 *   - Env    — fallback. Reads NEXUS_DEPOSIT_SECRET_KEY (base58 64-byte
 *              tweetnacl secret), builds an in-memory @solana/kit
 *              keypair. Convenient for local dev; never use in prod.
 *
 * EVM signing modes (Phase 1):
 *   - Env    — reads NEXUS_EVM_PRIVATE_KEY (0x-prefixed 32-byte hex).
 *              Builds a viem WalletClient and converts via
 *              toFacilitatorEvmSigner. Suitable for Base Sepolia
 *              testnet. KMS variant arrives in a follow-up.
 *
 * Each chain's signer wallet must hold native gas:
 *   - Solana: ~5000 lamports per tx on devnet (faucet at solana.com)
 *   - Base Sepolia: a few finney of ETH (faucets at sepoliafaucet.com)
 */

import bs58 from "bs58";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import {
  toFacilitatorSvmSigner,
  SOLANA_DEVNET_CAIP2,
  SOLANA_MAINNET_CAIP2,
  type FacilitatorSvmSigner,
} from "@x402/svm";
import { ExactSvmScheme } from "@x402/svm/exact/facilitator";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { x402Facilitator } from "@x402/core/facilitator";
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  SupportedResponse,
  VerifyResponse,
} from "@x402/core/types";
import type { FacilitatorClient } from "@x402/core/server";
import { getKmsFacilitatorSigner } from "./kms-signer";
import { buildEvmFacilitatorSigner } from "./evm-signer";
import { BASE_MAINNET_CAIP2, BASE_SEPOLIA_CAIP2 } from "./x402";
import { log } from "./log";

async function buildSvmSigner(): Promise<FacilitatorSvmSigner> {
  const useKms = !!process.env.NEXUS_KMS_KEY_ID?.trim();

  if (useKms) {
    const signer = await getKmsFacilitatorSigner();
    const [derived] = signer.getAddresses();
    log.info({ event: "facilitator.kms.ready", address: derived });
    const expected = process.env.NEXUS_DEPOSIT_ADDRESS?.trim();
    if (expected && expected !== derived) {
      log.error({
        event: "facilitator.kms.address_mismatch",
        derived,
        expected,
      });
      throw new Error(
        `KMS public key (${derived}) does not match NEXUS_DEPOSIT_ADDRESS (${expected})`
      );
    }
    return signer;
  }
  const secretKeyBase58 = process.env.NEXUS_DEPOSIT_SECRET_KEY?.trim();
  if (!secretKeyBase58) {
    throw new Error(
      "Set NEXUS_KMS_KEY_ID (preferred) or NEXUS_DEPOSIT_SECRET_KEY (fallback) for the local facilitator"
    );
  }
  const privateKeyBytes = bs58.decode(secretKeyBase58);
  const keypair = await createKeyPairSignerFromBytes(privateKeyBytes);
  return toFacilitatorSvmSigner(keypair);
}

async function build(): Promise<x402Facilitator> {
  const facilitator = new x402Facilitator();

  // Solana — always present (the facilitator is Solana-first).
  const svmSigner = await buildSvmSigner();
  facilitator.register(
    [SOLANA_DEVNET_CAIP2, SOLANA_MAINNET_CAIP2],
    new ExactSvmScheme(svmSigner)
  );

  // Base (EVM) — opt-in. Skipped if NEXUS_EVM_PRIVATE_KEY isn't set so
  // Solana-only deployments don't fail closed.
  if (process.env.NEXUS_EVM_PRIVATE_KEY?.trim()) {
    const evmSigner = buildEvmFacilitatorSigner();
    const [evmAddress] = evmSigner.getAddresses();
    log.info({ event: "facilitator.evm.ready", address: evmAddress });
    facilitator.register(
      [BASE_MAINNET_CAIP2, BASE_SEPOLIA_CAIP2],
      new ExactEvmScheme(evmSigner)
    );
  }

  return facilitator;
}

let cached: Promise<FacilitatorClient> | null = null;

export function getLocalFacilitator(): Promise<FacilitatorClient> {
  if (cached) return cached;
  cached = (async () => {
    const f = await build();
    const client: FacilitatorClient = {
      verify(
        payload: PaymentPayload,
        requirements: PaymentRequirements
      ): Promise<VerifyResponse> {
        return f.verify(payload, requirements);
      },
      settle(
        payload: PaymentPayload,
        requirements: PaymentRequirements
      ): Promise<SettleResponse> {
        return f.settle(payload, requirements);
      },
      async getSupported(): Promise<SupportedResponse> {
        // x402Facilitator.getSupported() returns `network: string`, but
        // SupportedResponse.kinds[].network is the CAIP-2-typed Network.
        // The underlying values are valid Network strings; cast through.
        return f.getSupported() as unknown as SupportedResponse;
      },
    };
    return client;
  })();
  return cached;
}
