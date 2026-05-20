// STUB — owned by the parallel playground-storage session. The real
// implementation will replace this file when its PR merges. Until then,
// calls throw.

export type RateLimitResult = {
  allowed: boolean;
  retry_after_ms?: number;
};

export async function checkRateLimit(_ipHash: string): Promise<RateLimitResult> {
  throw new Error("not_implemented: lib/playground/rate-limit.ts");
}
