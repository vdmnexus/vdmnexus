/**
 * VDM Nexus action provider for Coinbase AgentKit.
 *
 * Exposes three actions:
 *   • nexus_chat                — pay-per-call signed inference via x402
 *   • nexus_verify_receipt      — five-check SIR v2 verification
 *   • nexus_get_deposit_address — on-chain top-up destination lookup
 *
 * The provider is bound to an `SvmWalletProvider` because settlement is
 * Solana-native today (an Ed25519 wallet keypair signs the SPL USDC
 * transfer carried in the x402 `X-Payment` header). The same provider
 * can target Solana mainnet, Solana devnet, Base mainnet, or Base Sepolia
 * via the per-call `network` argument — the Nexus facilitator handles the
 * chain switch server-side. EVM-only support is a follow-up.
 *
 * See: https://docs.vdmnexus.com/docs/spec/sir-v2
 */

import { z } from "zod";
import {
  ActionProvider,
  CreateAction,
  type Network,
  type SvmWalletProvider,
} from "@coinbase/agentkit";
import {
  NexusChatSchema,
  executeNexusChat,
} from "./actions/nexus-chat.js";
import {
  NexusVerifyReceiptSchema,
  executeNexusVerifyReceipt,
} from "./actions/nexus-verify-receipt.js";
import {
  NexusGetDepositAddressSchema,
  executeNexusGetDepositAddress,
} from "./actions/nexus-get-deposit-address.js";

const DEFAULT_ENDPOINT = "https://nexus.vdmnexus.com/api/v1";

/**
 * Configuration for the VDM Nexus action provider.
 */
export interface VdmNexusActionProviderConfig {
  /**
   * Base URL of the Nexus deployment to target. Includes the version prefix.
   * Defaults to the public production endpoint.
   *
   * @default "https://nexus.vdmnexus.com/api/v1"
   */
  endpoint?: string;

  /**
   * Optional base58 Ed25519 operator public key to pin for offline receipt
   * verification. When omitted, the verifier fetches it from
   * `${endpoint}/operator-key` on first use. Pinning is recommended for
   * production audit pipelines so a compromised endpoint cannot serve a
   * forged operator key.
   */
  operatorKey?: string;
}

/**
 * `VdmNexusActionProvider` — signed inference + receipt verification for
 * autonomous agents.
 */
export class VdmNexusActionProvider extends ActionProvider<SvmWalletProvider> {
  private readonly endpoint: string;
  private readonly operatorKey: string | undefined;

  /**
   * Construct a new provider.
   *
   * @param config - Optional endpoint + operator-key overrides.
   */
  constructor(config?: VdmNexusActionProviderConfig) {
    super("vdm_nexus", []);
    this.endpoint = (config?.endpoint ?? DEFAULT_ENDPOINT).replace(/\/$/, "");
    this.operatorKey = config?.operatorKey;
  }

  /**
   * Pay-per-call inference. Settles a USDC payment inline via x402 and
   * returns the OpenAI chat completion plus the signed receipt.
   *
   * @param walletProvider - AgentKit-managed Solana wallet. Its keypair
   *   signs the SPL USDC transfer; no separate agent secret env var is
   *   needed — the wallet IS the agent identity.
   * @param args - Validated `NexusChatSchema` arguments.
   * @returns JSON string: `{ ok, openai, receipt, payment }` on success;
   *   `{ ok: false, error, … }` on failure.
   */
  @CreateAction({
    name: "nexus_chat",
    description:
      "Run a paid inference call against VDM Nexus. Settles a USDC payment " +
      "inline via x402 on Solana or Base, runs the inference upstream, and " +
      "returns the OpenAI chat completion alongside a Signed Inference " +
      "Receipt (SIR v2) anchored to the on-chain settlement tx. The wallet " +
      "used by AgentKit signs the payment — no separate agent key needed.",
    schema: NexusChatSchema,
  })
  async nexusChat(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof NexusChatSchema>,
  ): Promise<string> {
    return executeNexusChat(this.endpoint, walletProvider, args);
  }

  /**
   * Verify a signed receipt end-to-end.
   *
   * @param args - Validated `NexusVerifyReceiptSchema` arguments. Pass the
   *   original prompt + response so the verifier can recompute hashes.
   * @returns JSON string: `{ ok, checks: { prompt_hash_ok, … } }`.
   */
  @CreateAction({
    name: "nexus_verify_receipt",
    description:
      "Verify a VDM Nexus Signed Inference Receipt (SIR v2) end-to-end. " +
      "Runs five checks: prompt_hash_ok, response_hash_ok, " +
      "nexus_signature_ok, payment_on_chain_ok, payer_matches. Returns " +
      "the full breakdown so the agent can decide what to do on partial " +
      "failure (e.g. ignore vacuous payment checks on prepaid receipts).",
    schema: NexusVerifyReceiptSchema,
  })
  async nexusVerifyReceipt(
    args: z.infer<typeof NexusVerifyReceiptSchema>,
  ): Promise<string> {
    return executeNexusVerifyReceipt(this.endpoint, this.operatorKey, args);
  }

  /**
   * Get the USDC deposit address for prepaid credit top-ups.
   *
   * @param args - Validated `NexusGetDepositAddressSchema` arguments.
   * @returns JSON string: `{ ok, address, mint, network }`.
   */
  @CreateAction({
    name: "nexus_get_deposit_address",
    description:
      "Fetch the on-chain USDC deposit address for topping up an agent's " +
      "prepaid credit balance on a VDM Nexus deployment. Per-call x402 " +
      "settlement (nexus_chat) does NOT require this — it settles inline. " +
      "Use this when batching deposits is cheaper than per-call settlement.",
    schema: NexusGetDepositAddressSchema,
  })
  async nexusGetDepositAddress(
    args: z.infer<typeof NexusGetDepositAddressSchema>,
  ): Promise<string> {
    return executeNexusGetDepositAddress(this.endpoint, args);
  }

  /**
   * The provider currently supports Solana networks (mainnet, devnet,
   * testnet). Base support flows through the same provider via the
   * per-call `network` override on `nexus_chat`, but full EVM wallet
   * binding will be a follow-up — until then, the wallet attached to
   * AgentKit must be a Solana wallet.
   *
   * @param network - The AgentKit network descriptor.
   * @returns True iff `network.protocolFamily === "svm"`.
   */
  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "svm";
  }
}

/**
 * Factory function — preferred by the AgentKit composition style.
 *
 * @param config - Optional endpoint + operator-key overrides.
 * @returns A fresh `VdmNexusActionProvider` instance.
 */
export const vdmNexusActionProvider = (
  config?: VdmNexusActionProviderConfig,
) => new VdmNexusActionProvider(config);
