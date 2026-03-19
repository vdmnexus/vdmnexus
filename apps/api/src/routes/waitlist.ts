import { Hono } from "hono";
import { db } from "../db/index.js";
import { waitlist } from "../db/schema.js";

export const waitlistRouter = new Hono();

waitlistRouter.post("/", async (c) => {
  const body = await c.req.json<{ email: string; company?: string; useCase?: string }>();

  if (!body.email) {
    return c.json({ error: "Email is required" }, 400);
  }

  try {
    const [entry] = await db
      .insert(waitlist)
      .values({
        email: body.email,
        company: body.company ?? null,
        useCase: body.useCase ?? null,
      })
      .onConflictDoNothing()
      .returning();

    if (!entry) {
      return c.json({ message: "Already on the waitlist" }, 200);
    }

    return c.json({ message: "Added to waitlist", id: entry.id }, 201);
  } catch (err) {
    console.error("Waitlist error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

waitlistRouter.get("/", async (c) => {
  const entries = await db.select().from(waitlist).orderBy(waitlist.createdAt);
  return c.json(entries);
});
