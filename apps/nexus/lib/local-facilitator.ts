/**
 * Self-hosted x402 facilitator — verifies and settles Solana-USDC
 * payments in-process using @x402/svm's ExactSvmScheme.
 *
 * Two signing modes, selected at build time:
 *   - KMS    — preferred. Triggered when NEXUS_KMS_KEY_ID is set.
 *              The Ed25519 private key lives in AWS KMS; only KMS.Sign
 *              round-trips touch it. Fee-payer address is derived from
 *              KMS.GetPublicKey at startup and asserted to match
 *              NEXUS_DEPOSIT_ADDRESS.
 *   - Env    — fallback. Reads NEXUS_DEPOSIT_SECRET_KEY (base58 64-byte
 *              tweetnacl secret), builds an in-memory @solana/kit
 *              keypair. Convenient for local dev; never use in prod.
 *
 * Whichever signer is built must hold enough SOL on the target network
 * to cover transaction fees (~5000 lamports each on devnet — request a
 * free airdrop at https://faucet.solana.com).
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
import { log } from "./log";

async function build(): Promise<x402Facilitator> {
  const useKms = !!process.env.NEXUS_KMS_KEY_ID?.trim();

  let signer: FacilitatorSvmSigner;
  if (useKms) {
    signer = await getKmsFacilitatorSigner();
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
  } else {
    const secretKeyBase58 = process.env.NEXUS_DEPOSIT_SECRET_KEY?.trim();
    if (!secretKeyBase58) {
      throw new Error(
        "Set NEXUS_KMS_KEY_ID (preferred) or NEXUS_DEPOSIT_SECRET_KEY (fallback) for the local facilitator"
      );
    }
    const privateKeyBytes = bs58.decode(secretKeyBase58);
    const keypair = await createKeyPairSignerFromBytes(privateKeyBytes);
    signer = toFacilitatorSvmSigner(keypair);
  }

  const scheme = new ExactSvmScheme(signer);
  return new x402Facilitator().register(
    [SOLANA_DEVNET_CAIP2, SOLANA_MAINNET_CAIP2],
    scheme
  );
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
