/**
 * `nexusFetch` — a `fetch` shim that wraps Nexus's `/chat/completions`
 * endpoint with the x402 handshake. Drop-in: returns a function with the
 * same signature as `globalThis.fetch`, so the AI SDK's openai-compatible
 * provider treats it as the transport.
 *
 * Behaviour on each call:
 *   1. POST through unchanged for non-chat-completion requests.
 *   2. For `/chat/completions`, do a no-payment probe → expect 402 →
 *      build a signed SPL/ERC-3009 payment via `@vdm-nexus/x402` →
 *      retry with `X-Payment`.
 *   3. Read the receipt and payment headers off the paid response, splice
 *      them into the JSON body as `_nexus`, and return a synthesized
 *      Response with the same status/headers but the augmented body.
 *
 * The body-injection step is how the receipt crosses into AI SDK's
 * `MetadataExtractor` — that API surfaces only parsed body, not headers,
 * so we have to pipe the receipt through the body.
 *
 * Streaming is forced to `false` upstream because the Nexus chat-completions
 * route does not yet support SSE responses. AI SDK consumers calling
 * `streamText` will still work — the provider returns a fully-buffered body
 * which AI SDK then exposes via its streaming surface.
 */

import type {
  PaymentRequired,
  X402Agent,
} from "@vdm-nexus/x402";

const PAYMENT_HEADER = "x-payment";
const PAYMENT_REQUIRED_HEADER = "x-payment-required";
const PAYMENT_RESPONSE_HEADER = "x-payment-response";
const RECEIPT_HEADER = "x-nexus-receipt";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export interface NexusFetchOptions {
  agent: X402Agent;
  endpoint: string;
  network?: string;
  /** Optional underlying transport; defaults to global fetch. */
  underlyingFetch?: typeof fetch;
}

function decodeHeader<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function encodeHeader(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function isChatCompletionsUrl(url: string): boolean {
  return url.endsWith("/chat/completions") || url.includes("/chat/completions?");
}

function urlOf(input: FetchInput): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  // Request
  return (input as Request).url;
}

function methodOf(input: FetchInput, init?: FetchInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === "object" && "method" in (input as object)) {
    return ((input as Request).method ?? "GET").toUpperCase();
  }
  return "GET";
}

async function readBodyText(input: FetchInput, init?: FetchInit): Promise<string> {
  if (init?.body) {
    if (typeof init.body === "string") return init.body;
    if (init.body instanceof Uint8Array) {
      return new TextDecoder().decode(init.body);
    }
    if (init.body instanceof ArrayBuffer) {
      return new TextDecoder().decode(new Uint8Array(init.body));
    }
    // Best-effort fallback.
    return String(init.body);
  }
  if (typeof input === "object" && "text" in (input as object)) {
    return await (input as Request).clone().text();
  }
  return "";
}

function headersToObject(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  const out: Record<string, string> = {};
  if (h instanceof Headers) {
    h.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = v;
    return out;
  }
  return { ...(h as Record<string, string>) };
}

/**
 * Build the fetch shim. Closes over `agent` + endpoint so each provider
 * instance reuses the same `X402Agent` (and therefore the same compiled
 * x402 client) across requests.
 */
export function nexusFetch(opts: NexusFetchOptions): typeof fetch {
  const baseFetch = opts.underlyingFetch ?? fetch;
  const network = opts.network;
  const agent = opts.agent;

  const wrapped: typeof fetch = async (
    input: FetchInput,
    init?: FetchInit
  ): Promise<Response> => {
    const url = urlOf(input);
    const method = methodOf(input, init);

    if (method !== "POST" || !isChatCompletionsUrl(url)) {
      return baseFetch(input as Parameters<typeof fetch>[0], init);
    }

    // Parse the AI SDK-issued body so we can:
    //   - inject `network` if the caller set one
    //   - force `stream:false` (Nexus chat-completions doesn't stream yet)
    const rawBody = await readBodyText(input, init);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      // Pass through opaque bodies untouched — the upstream will 400.
      return baseFetch(url, {
        ...(init ?? {}),
        method: "POST",
        body: rawBody,
      });
    }

    if (network && parsed.network === undefined) parsed.network = network;
    if (parsed.stream) parsed.stream = false;
    const finalBody = JSON.stringify(parsed);

    const userHeaders = headersToObject(init?.headers);
    // Always send JSON; strip any pre-existing X-Payment so we always start clean.
    delete userHeaders[PAYMENT_HEADER];
    delete userHeaders[PAYMENT_HEADER.toLowerCase()];

    // 1. Probe.
    const probe = await baseFetch(url, {
      method: "POST",
      headers: { ...userHeaders, "content-type": "application/json" },
      body: finalBody,
    });

    if (probe.status !== 402) {
      // Endpoint did not gate the call (test fixture, free tier, etc.).
      // Pass response straight through, then enrich the body with whatever
      // receipt headers it happened to set.
      return enrichResponse(probe);
    }

    const challenge =
      decodeHeader<PaymentRequired>(probe.headers.get(PAYMENT_REQUIRED_HEADER)) ??
      (await (async () => {
        try {
          const body = (await probe.clone().json()) as {
            challenge?: PaymentRequired;
          };
          return body.challenge ?? null;
        } catch {
          return null;
        }
      })());

    if (!challenge) {
      // Endpoint signalled 402 without giving us a challenge — surface as-is.
      return probe;
    }

    // 2. Build signed payment. `X402Agent.buildPaymentPayload` is the
    // narrow surface we ship for exactly this case — pre-probed handshake.
    const payment = await agent.buildPaymentPayload(challenge);

    // 3. Paid retry.
    const paid = await baseFetch(url, {
      method: "POST",
      headers: {
        ...userHeaders,
        "content-type": "application/json",
        [PAYMENT_HEADER]: encodeHeader(payment),
      },
      body: finalBody,
    });

    return enrichResponse(paid);
  };

  return wrapped;
}


/**
 * Read the x402/Nexus headers off a response, splice them into the JSON
 * body as `_nexus`, and return a fresh Response. Non-JSON bodies pass
 * through unchanged.
 */
async function enrichResponse(res: Response): Promise<Response> {
  const receipt = decodeHeader<unknown>(res.headers.get(RECEIPT_HEADER));
  const payment = decodeHeader<unknown>(res.headers.get(PAYMENT_RESPONSE_HEADER));

  if (!receipt && !payment) return res;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return res;

  let body: unknown;
  try {
    body = await res.clone().json();
  } catch {
    return res;
  }

  if (!body || typeof body !== "object") return res;
  const enriched = {
    ...(body as Record<string, unknown>),
    _nexus: { receipt, payment },
  };

  const newHeaders = new Headers(res.headers);
  // Length will drift after we inject `_nexus` — drop the explicit length
  // so downstream code reads it from the new body.
  newHeaders.delete("content-length");

  return new Response(JSON.stringify(enriched), {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}
