import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "nexus_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("nexus-admin-v1").digest("hex");
}

export function verifyPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setAdminCookie(): Promise<void> {
  const token = expectedToken();
  if (!token) throw new Error("ADMIN_PASSWORD not set");
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const c = await cookies();
  const got = c.get(COOKIE_NAME)?.value;
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function requireAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get("x-admin-secret");
  if (header && verifyPassword(header)) return true;
  return await isAdmin();
}
