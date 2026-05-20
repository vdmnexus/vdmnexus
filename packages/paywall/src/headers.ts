/**
 * x402 wire-format header constants and base64-JSON codec.
 *
 * Lifted from `apps/nexus/lib/x402.ts` so the paywall package doesn't have
 * to depend on the Nexus app. The names match the spec (lowercase) so they
 * work as both Fetch header keys and Node.js request/response header keys.
 */

export const X402_PAYMENT_HEADER = "x-payment";
export const X402_REQUIRED_HEADER = "x-payment-required";
export const X402_RESPONSE_HEADER = "x-payment-response";
export const NEXUS_RECEIPT_HEADER = "x-nexus-receipt";

export function encodeHeader(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

export function decodeHeader<T = unknown>(value: string): T | null {
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
