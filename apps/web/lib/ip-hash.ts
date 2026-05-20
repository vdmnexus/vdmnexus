import { createHash } from "node:crypto";
import { type NextRequest } from "next/server";

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "vdm-fallback-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0];
    if (first) return first.trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
