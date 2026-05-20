/**
 * Hono adapter. Returns a Hono handler suitable for `app.post(path, ...)`.
 *
 * JSON parsing happens here on demand — Hono doesn't auto-parse, so we
 * accept any `content-type: application/json` body and pass `null` for
 * non-JSON requests (your `onPaid` will see `body: null`).
 */

import type { Context } from "hono";
import { createPaywall } from "../paywall.js";
import type { PaywallConfig } from "../types.js";

export function honoPaywall(config: PaywallConfig) {
  const { execute } = createPaywall(config);
  return async (c: Context): Promise<Response> => {
    const headers = lowerHeaders(c.req.header());
    const body =
      headers["content-type"]?.includes("application/json")
        ? await c.req.json().catch(() => null)
        : null;
    const result = await execute({
      method: c.req.method,
      url: c.req.url,
      headers,
      body,
    });
    return new Response(
      typeof result.body === "string" ? result.body : JSON.stringify(result.body),
      { status: result.status, headers: result.headers }
    );
  };
}

function lowerHeaders(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    out[k.toLowerCase()] = v;
  }
  return out;
}
