/**
 * @vdm-nexus/mastra-provider — Mastra wrapper around the Vercel AI SDK
 * provider for VDM Nexus.
 *
 * Mastra accepts any AI SDK `LanguageModelV3` natively in `new Agent({ model })`,
 * so most of the integration is a re-export. The only thing this package
 * adds is `nexusModel({...})` — a one-liner that builds a Nexus-backed
 * LanguageModel by model id without the user wiring `createNexus()` +
 * model construction in two steps. That keeps Mastra `Agent` definitions
 * compact:
 *
 * ```ts
 * import { Agent } from "@mastra/core";
 * import { nexusModel } from "@vdm-nexus/mastra-provider";
 *
 * const researcher = new Agent({
 *   name: "Researcher",
 *   model: nexusModel({ secretKey: process.env.AGENT_SECRET_KEY!, model: "openai/gpt-4o-mini" }),
 * });
 * ```
 *
 * Need the full provider surface (per-modelId calls, custom headers, etc.)?
 * Import `createNexus` from `@vdm-nexus/ai-sdk-provider` directly — Mastra
 * eats its language models without a wrapper.
 */

export { nexusModel, createNexusProvider } from "./mastra.js";
export type { NexusModelSettings } from "./mastra.js";

// Re-export the upstream provider so users only need one install.
export { createNexus } from "@vdm-nexus/ai-sdk-provider";
export type {
  NexusProvider,
  NexusProviderSettings,
  NexusProviderMetadata,
  NexusReceipt,
  NexusPaymentResponse,
} from "@vdm-nexus/ai-sdk-provider";
