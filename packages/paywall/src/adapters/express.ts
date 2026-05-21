/**
 * Express adapter. Mounts the paywall as ordinary route middleware.
 *
 * Mount `express.json()` (or your own JSON parser) before this so
 * `req.body` is already a parsed object. Returns the response itself
 * — there's no `next()` call because a paid request is the full
 * lifecycle, and an unpaid one ends in a 402 response.
 */

import type { Request, Response } from "express";
import { createPaywall } from "../paywall.js";
import type { PaywallConfig } from "../types.js";

export function expressPaywall(config: PaywallConfig) {
  const { execute } = createPaywall(config);
  return async (req: Request, res: Response): Promise<void> => {
    const result = await execute({
      method: req.method,
      url: req.originalUrl || req.url,
      headers: lowerHeaders(req.headers),
      body: req.body,
    });
    for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
    res.status(result.status).send(result.body);
  };
}

function lowerHeaders(raw: Request["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if (v == null) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return out;
}
