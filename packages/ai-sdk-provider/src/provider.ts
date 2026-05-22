/**
 * `createNexus` — Vercel AI SDK provider factory for VDM Nexus.
 *
 * The user-facing API mirrors `@ai-sdk/openai`: `const nx = createNexus({...});
 * generateText({ model: nx("openai/gpt-4o-mini"), ... })`. Under the hood
 * we delegate model construction to `createOpenAICompatible` and inject a
 * custom fetch that runs the x402 handshake transparently.
 *
 * The signed-inference receipt is read off the `x-nexus-receipt` response
 * header, stitched into the JSON body, and pulled into `providerMetadata.nexus`
 * by a `MetadataExtractor`. Streaming receipts behave identically — the
 * receipt header is emitted on the final HTTP response, which AI SDK exposes
 * to the metadata extractor's stream variant on the trailing chunk.
 */

import {
  createOpenAICompatible,
  type MetadataExtractor,
  type OpenAICompatibleProvider,
  type OpenAICompatibleProviderSettings,
} from "@ai-sdk/openai-compatible";
import { X402Agent } from "@vdm-nexus/x402";
import type {
  NexusReceipt as NexusReceiptUnion,
  X402PaymentResponse,
} from "@vdm-nexus/x402";
import { nexusFetch } from "./fetch.js";

/**
 * The SIR v2 receipt arriving with each chat-completion response. The
 * underlying type is the discriminated union of `SirPrepaid | SirX402`;
 * the `/chat/completions` endpoint always emits the x402 variant.
 */
export type NexusReceipt = NexusReceiptUnion;

/** Re-export the x402 payment summary type for callers. */
export type NexusPaymentResponse = X402PaymentResponse;

/**
 * The shape that lands on `result.providerMetadata.nexus` after a successful
 * call. Both fields are nullable — they only show up when the call actually
 * paid via the x402 handshake. A locally-mocked endpoint that does not
 * advertise a receipt header simply leaves the values as `null`.
 */
export interface NexusProviderMetadata {
  receipt: NexusReceipt | null;
  payment: NexusPaymentResponse | null;
  [k: string]: unknown;
}

export interface NexusProviderSettings {
  /**
   * Base58-encoded 64-byte tweetnacl secretKey. Generate one with
   * `nacl.sign.keyPair()` (or `Agent.generate().secretKeyBase58`). This is
   * also the agent's Solana wallet address — fund it with USDC to pay for
   * inference.
   *
   * Either `secretKey` or `agent` MUST be set.
   */
  secretKey?: string;

  /**
   * Optional pre-built `X402Agent`. Use this when you already manage the
   * agent's secret elsewhere (KMS, hardware wallet adapter, etc.).
   *
   * Either `secretKey` or `agent` MUST be set.
   */
  agent?: X402Agent;

  /**
   * Nexus API endpoint up to and including `/api/v1`. No trailing slash.
   *
   * Defaults to `https://nexus.vdmnexus.com/api/v1`.
   */
  endpoint?: string;

  /**
   * Optional CAIP-2 network identifier passed on every request, e.g.
   * `"solana:mainnet"`, `"solana:devnet"`, `"eip155:8453"` (Base mainnet),
   * `"eip155:84532"` (Base Sepolia). Omit to use the server's default.
   */
  network?: string;

  /**
   * Provider id for AI SDK error/metadata routing. Defaults to `"nexus"`.
   * Override if you want to namespace metadata under a different key.
   */
  name?: string;

  /**
   * Extra headers forwarded on every request (e.g. observability tags).
   */
  headers?: Record<string, string>;

  /**
   * Optional `fetch` override. Wrapped by the x402 handshake — set this if
   * you need a custom transport (e.g. an in-process test fetch).
   */
  fetch?: typeof fetch;
}

/**
 * Provider type. Identical surface to `OpenAICompatibleProvider`, plus the
 * Nexus metadata that arrives on every response.
 */
export type NexusProvider = OpenAICompatibleProvider;

/**
 * The language-model instance returned by calling the provider, i.e.
 * `nexus("openai/gpt-4o-mini")`. Exported so downstream wrappers
 * (`@vdm-nexus/mastra-provider`) can name the return type without
 * pulling in `@ai-sdk/provider` transitively.
 */
export type NexusLanguageModel = ReturnType<NexusProvider>;

const DEFAULT_ENDPOINT = "https://nexus.vdmnexus.com/api/v1";

/**
 * `metadataExtractor` plucks the receipt and payment payloads off the
 * synthetic `_nexus` field that `nexusFetch` injects into the response
 * body. AI SDK's `MetadataExtractor` only sees parsed body, not headers,
 * so this body-injection step is how the receipt crosses the boundary.
 */
function buildMetadataExtractor(providerKey: string): MetadataExtractor {
  // The extractor's return type is `SharedV3ProviderMetadata` (a JSON-only
  // record). The SIR v2 receipt is pure JSON, but the upstream type narrows
  // values to `JSONValue`. We cast through `unknown` to satisfy the
  // narrower upstream type without importing `@ai-sdk/provider` directly.
  type MetaReturn = ReturnType<MetadataExtractor["extractMetadata"]>;
  type StreamReturn = ReturnType<
    ReturnType<MetadataExtractor["createStreamExtractor"]>["buildMetadata"]
  >;
  return {
    async extractMetadata({ parsedBody }) {
      const meta = readNexusMeta(parsedBody);
      if (!meta) return undefined;
      return ({ [providerKey]: meta } as unknown) as Awaited<MetaReturn>;
    },
    createStreamExtractor() {
      let captured: NexusProviderMetadata | undefined;
      return {
        processChunk(parsedChunk: unknown) {
          const meta = readNexusMeta(parsedChunk);
          if (meta) captured = meta;
        },
        buildMetadata() {
          if (!captured) return undefined;
          return ({ [providerKey]: captured } as unknown) as StreamReturn;
        },
      };
    },
  };
}

function readNexusMeta(body: unknown): NexusProviderMetadata | undefined {
  if (!body || typeof body !== "object") return undefined;
  const maybe = (body as { _nexus?: unknown })._nexus;
  if (!maybe || typeof maybe !== "object") return undefined;
  const obj = maybe as Record<string, unknown>;
  return {
    receipt: (obj.receipt as NexusReceipt | null | undefined) ?? null,
    payment: (obj.payment as NexusPaymentResponse | null | undefined) ?? null,
  };
}

/**
 * Build a Nexus provider. Returns a callable that constructs language
 * models the same way `@ai-sdk/openai`'s `openai(...)` does.
 *
 * ```ts
 * const nexus = createNexus({ secretKey: process.env.AGENT_SECRET_KEY! });
 * const result = await generateText({
 *   model: nexus("openai/gpt-4o-mini"),
 *   prompt: "Why Ed25519?",
 * });
 * const receipt = result.providerMetadata?.nexus?.receipt;
 * ```
 */
export function createNexus(settings: NexusProviderSettings = {}): NexusProvider {
  if (!settings.secretKey && !settings.agent) {
    throw new Error(
      "@vdm-nexus/ai-sdk-provider: createNexus() requires either `secretKey` or `agent`"
    );
  }

  const agent =
    settings.agent ?? X402Agent.fromBase58(settings.secretKey as string);
  const endpoint = (settings.endpoint ?? DEFAULT_ENDPOINT).replace(/\/$/, "");
  const providerKey = settings.name ?? "nexus";

  // `createOpenAICompatible` calls `url({ modelId, path })` to build the
  // request URL. We pin every request at `/chat/completions` regardless of
  // what AI SDK asks for — our endpoint only speaks chat completions and
  // the x402 handshake assumes that path.
  const baseURL = endpoint;

  const fetchImpl = nexusFetch({
    agent,
    endpoint,
    network: settings.network,
    underlyingFetch: settings.fetch,
  });

  const compatSettings: OpenAICompatibleProviderSettings = {
    baseURL,
    name: providerKey,
    headers: settings.headers,
    fetch: fetchImpl,
    metadataExtractor: buildMetadataExtractor(providerKey),
    // Usage on the response body is already returned by `/chat/completions`;
    // surface it on streaming responses too.
    includeUsage: true,
  };

  return createOpenAICompatible(compatSettings);
}

/**
 * Convenience instance pinned to the public mainnet endpoint, configured
 * lazily from `process.env.AGENT_SECRET_KEY`. Useful for quick scripts:
 *
 * ```ts
 * import { nexus } from "@vdm-nexus/ai-sdk-provider";
 * const result = await generateText({ model: nexus("openai/gpt-4o-mini"), prompt: "..." });
 * ```
 *
 * Throws on first call if `AGENT_SECRET_KEY` isn't set. For all non-trivial
 * use cases, prefer `createNexus({...})` so secrets are explicit.
 */
export const nexus: (modelId: string) => ReturnType<NexusProvider> = (
  modelId: string
) => {
  if (!_lazyProvider) {
    const secretKey = process.env.AGENT_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "@vdm-nexus/ai-sdk-provider: AGENT_SECRET_KEY is not set. Use createNexus({ secretKey }) to pass it explicitly."
      );
    }
    _lazyProvider = createNexus({ secretKey });
  }
  return _lazyProvider(modelId);
};

let _lazyProvider: NexusProvider | null = null;
