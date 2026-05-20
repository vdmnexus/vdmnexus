/**
 * Next.js App Router adapter — returns a `POST`-compatible route handler.
 *
 * Usage in `app/api/<your-route>/route.ts`:
 *
 *     export const runtime = "nodejs";
 *     export const POST = nextPaywall({ … });
 *
 * Edge runtime is not supported — `signReceipt` uses `node:crypto` and
 * the receipt path expects Buffer.
 */

import { createPaywall } from "../paywall.js";
import type { PaywallConfig } from "../types.js";

type MinimalNextRequest = {
  method: string;
  url: string;
  headers: { forEach?: (cb: (value: string, key: string) => void) => void };
  json: () => Promise<unknown>;
};

export function nextPaywall(config: PaywallConfig) {
  const { execute } = createPaywall(config);
  return async (req: MinimalNextRequest): Promise<Response> => {
    const headers = headersToObject(req.headers);
    const body = await req.json().catch(() => null);
    const result = await execute({
      method: req.method,
      url: req.url,
      headers,
      body,
    });
    return new Response(
      typeof result.body === "string" ? result.body : JSON.stringify(result.body),
      { status: result.status, headers: result.headers }
    );
  };
}

function headersToObject(h: MinimalNextRequest["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach?.((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}
