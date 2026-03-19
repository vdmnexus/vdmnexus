import { SignJWT, jwtVerify } from "jose";
import { Context, Next } from "hono";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "nexus-dev-secret-change-in-production"
);

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as { userId: string; email: string };
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const token = header.slice(7);
    const payload = await verifyToken(token);
    c.set("userId", payload.userId);
    c.set("email", payload.email);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}
