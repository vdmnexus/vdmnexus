/**
 * @vdm-nexus/ai-sdk-provider — Vercel AI SDK provider for VDM Nexus.
 *
 * Wraps `@ai-sdk/openai-compatible`'s `createOpenAICompatible` with a custom
 * fetch that performs the x402 handshake against `/chat/completions`. The
 * SIR v2 signed-inference receipt and the x402 payment receipt are surfaced
 * via `providerMetadata.nexus.{receipt,payment}` on every response.
 *
 * One import. Zero handshake plumbing in user code.
 */

export { createNexus, nexus } from "./provider.js";
export type {
  NexusProvider,
  NexusProviderSettings,
  NexusProviderMetadata,
  NexusReceipt,
  NexusPaymentResponse,
  NexusLanguageModel,
} from "./provider.js";
