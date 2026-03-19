import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { employees, conversations, messages } from "../db/schema.js";
import { streamSSE } from "hono/streaming";

export const chatRouter = new Hono();

// Send message to employee and get response
chatRouter.post("/:employeeId", async (c) => {
  const employeeId = c.req.param("employeeId");
  const { message, conversationId } = await c.req.json<{
    message: string;
    conversationId?: string;
  }>();

  // Get employee
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });

  if (!employee) return c.json({ error: "Employee not found" }, 404);
  if (!employee.active) return c.json({ error: "Employee not deployed" }, 400);

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({ employeeId, channel: "dashboard" })
      .returning();
    convId = conv.id;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  // Build system prompt from soul memory + skills
  const systemPrompt = buildSystemPrompt(employee);

  // Get conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  // Call LLM
  const response = await callLLM(employee.model, systemPrompt, history);

  // Save assistant message
  const [assistantMsg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      role: "assistant",
      content: response.content,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
    })
    .returning();

  return c.json({
    conversationId: convId,
    message: assistantMsg,
  });
});

// Get conversation history
chatRouter.get("/:employeeId/conversations", async (c) => {
  const employeeId = c.req.param("employeeId");

  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.employeeId, employeeId))
    .orderBy(conversations.createdAt);

  return c.json(convs);
});

chatRouter.get("/conversations/:conversationId/messages", async (c) => {
  const conversationId = c.req.param("conversationId");

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return c.json(msgs);
});

// ─── Helpers ─────────────────────────────────────────────

function buildSystemPrompt(employee: typeof employees.$inferSelect): string {
  const parts: string[] = [];

  if (employee.soulMemory) {
    parts.push(employee.soulMemory);
  }

  if (employee.personality) {
    const p = employee.personality as { tone: number; proactivity: number; autonomy: number };
    const tone = p.tone > 60 ? "informeel en vriendelijk" : p.tone < 40 ? "formeel en professioneel" : "zakelijk maar toegankelijk";
    const proactive = p.proactivity > 60 ? "Je neemt proactief initiatief en doet suggesties." : "Je wacht op instructies voordat je actie onderneemt.";
    const autonomy = p.autonomy > 60 ? "Je handelt zelfstandig waar mogelijk." : "Je vraagt altijd bevestiging voordat je actie onderneemt.";
    parts.push(`Communicatiestijl: ${tone}. ${proactive} ${autonomy}`);
  }

  if (employee.guardrails && Array.isArray(employee.guardrails)) {
    parts.push(`Grenzen: ${employee.guardrails.join(". ")}.`);
  }

  if (employee.languages && Array.isArray(employee.languages)) {
    const lang = employee.languages[0] === "nl" ? "Nederlands" : employee.languages[0] === "en" ? "English" : employee.languages[0];
    parts.push(`Communiceer primair in het ${lang}.`);
  }

  return parts.join("\n\n");
}

interface LLMResponse {
  content: string;
  tokensIn?: number;
  tokensOut?: number;
}

async function callLLM(
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  // Try Anthropic first, then Moonshot/Kimi, then dev mode
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const moonshotKey = process.env.MOONSHOT_API_KEY;

  if (anthropicKey && model.startsWith("claude")) {
    return callAnthropic(anthropicKey, model, systemPrompt, history);
  }

  if (moonshotKey) {
    return callMoonshot(moonshotKey, systemPrompt, history);
  }

  return {
    content: `[Dev mode — geen API key] Je bericht is ontvangen. Model: ${model}. Configureer een API key voor echte responses.`,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const modelMap: Record<string, string> = {
    "claude-sonnet-4": "claude-sonnet-4-20250514",
    "claude-haiku-4": "claude-haiku-4-5-20251001",
    "claude-opus-4": "claude-opus-4-20250514",
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelMap[model] ?? "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    console.error("Anthropic error:", await response.text());
    return { content: "Er ging iets mis. Probeer het opnieuw." };
  }

  const data = await response.json() as {
    content: { text: string }[];
    usage: { input_tokens: number; output_tokens: number };
  };

  return {
    content: data.content[0]?.text ?? "",
    tokensIn: data.usage.input_tokens,
    tokensOut: data.usage.output_tokens,
  };
}

async function callMoonshot(
  apiKey: string,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "kimi-k2.5",
      messages,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    console.error("Moonshot error:", await response.text());
    return { content: "Er ging iets mis. Probeer het opnieuw." };
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: data.choices[0]?.message.content ?? "",
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
  };
}
