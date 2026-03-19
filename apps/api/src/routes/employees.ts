import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { employees, employeeSkills, skills, knowledgeFiles } from "../db/schema.js";

export const employeesRouter = new Hono();

// List all employees for a user
employeesRouter.get("/", async (c) => {
  // Support both auth token and query param (backwards compat)
  let userId = c.get("userId") as string | undefined;
  if (!userId) userId = c.req.query("userId") ?? undefined;
  if (!userId) return c.json({ error: "userId required" }, 400);

  const result = await db.select().from(employees).where(eq(employees.userId, userId));
  return c.json(result);
});

// Get single employee with skills and knowledge
employeesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    with: {
      skills: {
        with: { skill: true },
      },
      knowledgeFiles: true,
    },
  });

  if (!employee) return c.json({ error: "Not found" }, 404);
  return c.json(employee);
});

// Create employee
employeesRouter.post("/", async (c) => {
  const body = await c.req.json();

  const [employee] = await db
    .insert(employees)
    .values({
      userId: body.userId,
      name: body.name,
      role: body.role,
      avatar: body.avatar,
      model: body.model ?? "claude-sonnet-4",
      memoryMode: body.memoryMode ?? "persistent",
      soulMemory: body.soulMemory,
      personality: body.personality,
      languages: body.languages ?? ["nl"],
      channels: body.channels ?? ["dashboard"],
      guardrails: body.guardrails,
    })
    .returning();

  return c.json(employee, 201);
});

// Update employee
employeesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const [updated] = await db
    .update(employees)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// Delete employee
employeesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  // Clean up related data
  const empSkills = await db.select().from(employeeSkills).where(eq(employeeSkills.employeeId, id));
  for (const es of empSkills) {
    await db.delete(employeeSkills).where(eq(employeeSkills.id, es.id));
  }
  await db.delete(knowledgeFiles).where(eq(knowledgeFiles.employeeId, id));

  const [deleted] = await db.delete(employees).where(eq(employees.id, id)).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});

// Deploy / activate employee
employeesRouter.post("/:id/deploy", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(employees)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Employee deployed", employee: updated });
});

// Assign skill to employee
employeesRouter.post("/:id/skills", async (c) => {
  const employeeId = c.req.param("id");
  const { skillId } = await c.req.json<{ skillId: string }>();

  const [assignment] = await db
    .insert(employeeSkills)
    .values({ employeeId, skillId })
    .returning();

  return c.json(assignment, 201);
});
