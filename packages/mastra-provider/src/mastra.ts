/**
 * `nexusModel` — one-liner Mastra LLM builder backed by VDM Nexus.
 *
 * Mastra's `new Agent({ model })` argument accepts any AI SDK
 * `LanguageModelV3`. We accept the same settings as `createNexus` plus a
 * required `model` id and hand back the constructed LanguageModel, ready
 * to drop into a Mastra `Agent`.
 *
 * The receipt continues to surface via `providerMetadata.nexus.receipt`
 * exactly as in the bare AI SDK provider — Mastra preserves provider
 * metadata on its `generate`/`stream` results.
 */

import {
  createNexus,
  type NexusLanguageModel,
  type NexusProvider,
  type NexusProviderSettings,
} from "@vdm-nexus/ai-sdk-provider";

export interface NexusModelSettings extends NexusProviderSettings {
  /**
   * OpenRouter model slug (e.g. `"openai/gpt-4o-mini"`, `"anthropic/claude-3-haiku"`).
   */
  model: string;
}

/**
 * Build a Mastra-ready LanguageModel pointing at VDM Nexus.
 *
 * ```ts
 * import { Agent } from "@mastra/core";
 * import { nexusModel } from "@vdm-nexus/mastra-provider";
 *
 * const agent = new Agent({
 *   name: "Researcher",
 *   model: nexusModel({
 *     secretKey: process.env.AGENT_SECRET_KEY!,
 *     model: "openai/gpt-4o-mini",
 *   }),
 * });
 * ```
 */
export function nexusModel(settings: NexusModelSettings): NexusLanguageModel {
  const { model, ...providerSettings } = settings;
  const provider = createNexus(providerSettings);
  return provider(model);
}

/**
 * If you need to build several models off the same agent / endpoint
 * configuration (one Mastra agent per model id, for instance), build the
 * provider once and reuse it.
 *
 * ```ts
 * const nexus = createNexusProvider({ secretKey: process.env.AGENT_SECRET_KEY! });
 *
 * const fast      = new Agent({ name: "fast",   model: nexus("openai/gpt-4o-mini") });
 * const reasoning = new Agent({ name: "reason", model: nexus("anthropic/claude-3-haiku") });
 * ```
 */
export function createNexusProvider(
  settings: NexusProviderSettings
): NexusProvider {
  return createNexus(settings);
}
