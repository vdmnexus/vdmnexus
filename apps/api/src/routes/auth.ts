import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { createToken } from "../lib/auth.js";

export const authRouter = new Hono();

// Register
authRouter.post("/register", async (c) => {
  const { email, password, name } = await c.req.json<{
    email: string;
    password: string;
    name?: string;
  }>();

  if (!email || !password) {
    return c.json({ error: "Email en wachtwoord zijn verplicht" }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: "Wachtwoord moet minimaal 6 tekens zijn" }, 400);
  }

  // Check if user exists
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing[0]) {
    return c.json({ error: "Er bestaat al een account met dit e-mailadres" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name: name ?? null,
      plan: "starter",
      passwordHash,
    })
    .returning();

  const token = await createToken(user.id, user.email);

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  }, 201);
});

// Login
authRouter.post("/login", async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();

  if (!email || !password) {
    return c.json({ error: "Email en wachtwoord zijn verplicht" }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || !user.passwordHash) {
    return c.json({ error: "Ongeldige inloggegevens" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Ongeldige inloggegevens" }, 401);
  }

  const token = await createToken(user.id, user.email);

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  });
});

// Get current user
authRouter.get("/me", async (c) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { verifyToken } = await import("../lib/auth.js");
    const payload = await verifyToken(header.slice(7));
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({ id: user.id, email: user.email, name: user.name, plan: user.plan });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
