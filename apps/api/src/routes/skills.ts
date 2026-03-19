import { Hono } from "hono";
import { eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { skills } from "../db/schema.js";

export const skillsRouter = new Hono();

// List pre-built skills + user's custom skills
skillsRouter.get("/", async (c) => {
  const userId = c.req.query("userId");

  // Pre-built skills (userId is null) + user's custom skills
  const result = userId
    ? await db.select().from(skills).where(
        // Can't use OR easily, so two queries
        isNull(skills.userId)
      )
    : await db.select().from(skills).where(isNull(skills.userId));

  // If userId, also get their custom skills
  if (userId) {
    const custom = await db.select().from(skills).where(eq(skills.userId, userId));
    return c.json([...result, ...custom]);
  }

  return c.json(result);
});

// Get single skill
skillsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const skill = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  if (!skill[0]) return c.json({ error: "Not found" }, 404);
  return c.json(skill[0]);
});

// Create custom skill
skillsRouter.post("/", async (c) => {
  const body = await c.req.json();

  const [skill] = await db
    .insert(skills)
    .values({
      userId: body.userId,
      name: body.name,
      description: body.description,
      type: "custom",
      config: body.config,
    })
    .returning();

  return c.json(skill, 201);
});

// Update skill
skillsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const [updated] = await db
    .update(skills)
    .set(body)
    .where(eq(skills.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// Delete skill
skillsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db.delete(skills).where(eq(skills.id, id)).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
