import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { log } from "./log";

const IP_LIMIT_PER_MINUTE = 30;
const PUBKEY_LIMIT_PER_MINUTE = 100;

let ipLimiter: Ratelimit | null = null;
let pubkeyLimiter: Ratelimit | null = null;
let warnedUnavailable = false;

function init() {
  // The Vercel Marketplace Upstash integration writes KV_REST_API_* env vars
  // (legacy naming, same Upstash backend). Standalone Upstash uses UPSTASH_*.
  // Accept either; UPSTASH_* takes precedence if both are set.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;

  const redis = new Redis({ url, token });
  ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(IP_LIMIT_PER_MINUTE, "1 m"),
    prefix: "nexus:rl:ip",
    analytics: false,
  });
  pubkeyLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(PUBKEY_LIMIT_PER_MINUTE, "1 m"),
    prefix: "nexus:rl:pk",
    analytics: false,
  });
}
init();

function warnOnce() {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  log.warn({ event: "rate_limit.unavailable", reason: "env_missing" });
}

export type KeyType = "ip" | "pubkey";

export type RateLimitDecision = {
  allowed: boolean;
  key_type: KeyType;
  limit: number;
  remaining: number;
  reset: number;
};

const ALLOW_NOOP = (key_type: KeyType): RateLimitDecision => {
  warnOnce();
  const limit = key_type === "ip" ? IP_LIMIT_PER_MINUTE : PUBKEY_LIMIT_PER_MINUTE;
  return { allowed: true, key_type, limit, remaining: limit, reset: 0 };
};

export async function enforceIp(ip: string): Promise<RateLimitDecision> {
  if (!ipLimiter) return ALLOW_NOOP("ip");
  const r = await ipLimiter.limit(ip);
  return {
    allowed: r.success,
    key_type: "ip",
    limit: IP_LIMIT_PER_MINUTE,
    remaining: r.remaining,
    reset: r.reset,
  };
}

export async function enforcePubkey(pubkey: string): Promise<RateLimitDecision> {
  if (!pubkeyLimiter) return ALLOW_NOOP("pubkey");
  const r = await pubkeyLimiter.limit(pubkey);
  return {
    allowed: r.success,
    key_type: "pubkey",
    limit: PUBKEY_LIMIT_PER_MINUTE,
    remaining: r.remaining,
    reset: r.reset,
  };
}

export function rateLimitHeaders(d: RateLimitDecision): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(d.limit),
    "X-RateLimit-Remaining": String(d.remaining),
    "X-RateLimit-Reset": String(d.reset),
  };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}
