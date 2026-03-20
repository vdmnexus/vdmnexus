import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { employees, conversations, messages, employeeSkills, skills } from "../db/schema.js";
import { buildVastgoedContext } from "../lib/vastgoed-context.js";
import { getAllTools, getTool, toolsToAnthropicFormat, type ToolDefinition } from "../lib/tools/index.js";

export const chatRouter = new Hono();

// Max tool-call iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 10;

// ─── Types for Anthropic API ────────────────────────────

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | (AnthropicContentBlock | AnthropicToolResultBlock)[];
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  usage: { input_tokens: number; output_tokens: number };
}

// ─── Non-streaming endpoint (legacy) ────────────────────

chatRouter.post("/:employeeId", async (c) => {
  const employeeId = c.req.param("employeeId");
  const { message, conversationId } = await c.req.json<{
    message: string;
    conversationId?: string;
  }>();

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });

  if (!employee) return c.json({ error: "Employee not found" }, 404);
  if (!employee.active) return c.json({ error: "Employee not deployed" }, 400);

  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({ employeeId, channel: "dashboard" })
      .returning();
    convId = conv.id;
  }

  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  const systemPrompt = await buildSystemPrompt(employee);

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  const response = await callLLMWithTools(employee.model, systemPrompt, history);

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

// ─── Streaming endpoint (SSE) with agentic tool loop ────

chatRouter.post("/:employeeId/stream", async (c) => {
  const employeeId = c.req.param("employeeId");
  const { message, conversationId } = await c.req.json<{
    message: string;
    conversationId?: string;
  }>();

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });

  if (!employee) return c.json({ error: "Employee not found" }, 404);
  if (!employee.active) return c.json({ error: "Employee not deployed" }, 400);

  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({ employeeId, channel: "dashboard" })
      .returning();
    convId = conv.id;
  }

  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  const systemPrompt = await buildSystemPrompt(employee);

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: "meta", data: JSON.stringify({ conversationId: convId }) });

    let fullContent = "";
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      const moonshotKey = process.env.MOONSHOT_API_KEY;

      if (anthropicKey && employee.model.startsWith("claude")) {
        const tools = getAllTools();
        const result = await streamAnthropicWithTools(
          anthropicKey,
          employee.model,
          systemPrompt,
          history,
          tools,
          async (chunk) => {
            fullContent += chunk;
            await stream.writeSSE({ event: "chunk", data: chunk });
          },
          async (toolName, toolInput) => {
            // Notify client that a tool is being used
            await stream.writeSSE({
              event: "tool_use",
              data: JSON.stringify({ tool: toolName }),
            });
          },
          (usage) => {
            totalTokensIn += usage.inputTokens;
            totalTokensOut += usage.outputTokens;
          }
        );
      } else if (moonshotKey) {
        const tools = getAllTools();
        await streamMoonshotWithTools(
          moonshotKey,
          systemPrompt,
          history,
          tools,
          async (chunk) => {
            fullContent += chunk;
            await stream.writeSSE({ event: "chunk", data: chunk });
          },
          async (toolName) => {
            await stream.writeSSE({
              event: "tool_use",
              data: JSON.stringify({ tool: toolName }),
            });
          },
          (usage) => {
            totalTokensIn += usage.inputTokens;
            totalTokensOut += usage.outputTokens;
          }
        );
      } else {
        const devMsg = `[Dev mode — geen API key] Je bericht is ontvangen. Model: ${employee.model}. Configureer een API key voor echte responses.`;
        fullContent = devMsg;
        await stream.writeSSE({ event: "chunk", data: devMsg });
      }

      // Save complete response to DB
      await db.insert(messages).values({
        conversationId: convId!,
        role: "assistant",
        content: fullContent,
        tokensIn: totalTokensIn || null,
        tokensOut: totalTokensOut || null,
      });

      await stream.writeSSE({ event: "done", data: JSON.stringify({ tokensIn: totalTokensIn, tokensOut: totalTokensOut }) });
    } catch (err) {
      console.error("Stream error:", err);
      const errorMsg = "Er ging iets mis. Probeer het opnieuw.";
      if (!fullContent) {
        await stream.writeSSE({ event: "chunk", data: errorMsg });
        fullContent = errorMsg;
      }
      await stream.writeSSE({ event: "error", data: "stream_error" });
    }
  });
});

// ─── Conversation history ───────────────────────────────

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

// ─── System Prompt Builder ──────────────────────────────

interface SkillConfig {
  trigger?: string;
  instructions?: string;
  outputFormat?: string;
  constraints?: string[];
  dataAccess?: string[];
}

async function buildSystemPrompt(employee: typeof employees.$inferSelect): Promise<string> {
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

  // Skills from DB
  const empSkills = await db
    .select({ name: skills.name, description: skills.description, config: skills.config, enabled: employeeSkills.enabled })
    .from(employeeSkills)
    .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
    .where(eq(employeeSkills.employeeId, employee.id));

  const activeSkills = empSkills.filter((s) => s.enabled);
  if (activeSkills.length > 0) {
    parts.push("\n# Jouw skills en verantwoordelijkheden\n");
    for (const skill of activeSkills) {
      const config = skill.config as SkillConfig | null;
      const lines: string[] = [`## Skill: ${skill.name}`];
      if (skill.description) lines.push(skill.description);
      if (config?.trigger) lines.push(`**Wanneer:** ${config.trigger}`);
      if (config?.instructions) lines.push(`**Instructies:** ${config.instructions}`);
      if (config?.outputFormat) lines.push(`**Outputformaat:** ${config.outputFormat}`);
      if (config?.constraints?.length) lines.push(`**Let op:** ${config.constraints.join(". ")}`);
      if (config?.dataAccess?.length) lines.push(`**Beschikbare data:** ${config.dataAccess.join(", ")}`);
      parts.push(lines.join("\n"));
    }
  }

  // Tools instruction
  const tools = getAllTools();
  if (tools.length > 0) {
    parts.push(`\n# Beschikbare tools\nJe hebt toegang tot ${tools.length} tools waarmee je echte acties kunt uitvoeren (bestanden opzoeken in RushFiles, etc.). Gebruik deze tools wanneer de gebruiker om iets vraagt dat je niet alleen uit de data-context kunt beantwoorden. Bij het zoeken in RushFiles, begin altijd met rushfiles_list_shares als je nog geen share ID hebt.`);
  }

  // Vastgoeddata context
  parts.push("\n" + buildVastgoedContext());

  return parts.join("\n\n");
}

// ─── Non-streaming LLM with agentic tool loop ──────────

interface LLMResponse {
  content: string;
  tokensIn?: number;
  tokensOut?: number;
}

async function callLLMWithTools(
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const moonshotKey = process.env.MOONSHOT_API_KEY;

  if (anthropicKey && model.startsWith("claude")) {
    return callAnthropicWithTools(anthropicKey, model, systemPrompt, history);
  }

  if (moonshotKey) {
    return callMoonshotWithTools(moonshotKey, systemPrompt, history);
  }

  return {
    content: `[Dev mode — geen API key] Je bericht is ontvangen. Model: ${model}. Configureer een API key voor echte responses.`,
  };
}

async function callAnthropicWithTools(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const tools = getAllTools();
  const anthropicTools = tools.length > 0 ? toolsToAnthropicFormat(tools) : undefined;

  // Build conversation messages for the agentic loop
  let conversationMessages: AnthropicMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" as const : "user" as const,
    content: m.content,
  }));

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: Record<string, unknown> = {
      model: resolveAnthropicModel(model),
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationMessages,
    };
    if (anthropicTools && anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Anthropic error:", await response.text());
      return { content: "Er ging iets mis. Probeer het opnieuw.", tokensIn: totalTokensIn, tokensOut: totalTokensOut };
    }

    const data = await response.json() as AnthropicResponse;
    totalTokensIn += data.usage.input_tokens;
    totalTokensOut += data.usage.output_tokens;

    // Extract text from response
    const textBlocks = data.content.filter((b): b is AnthropicTextBlock => b.type === "text");
    const toolUseBlocks = data.content.filter((b): b is AnthropicToolUseBlock => b.type === "tool_use");

    finalText += textBlocks.map((b) => b.text).join("");

    // If no tool calls, we're done
    if (data.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      break;
    }

    // Execute tools and build tool results
    const toolResults: AnthropicToolResultBlock[] = [];
    for (const toolCall of toolUseBlocks) {
      console.log(`[Tool] Executing: ${toolCall.name}`, JSON.stringify(toolCall.input));
      const tool = getTool(toolCall.name);
      let result: string;
      if (tool) {
        try {
          result = await tool.execute(toolCall.input);
        } catch (err) {
          result = `Tool fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
        }
      } else {
        result = `Tool "${toolCall.name}" niet gevonden.`;
      }
      console.log(`[Tool] Result (${toolCall.name}):`, result.slice(0, 200));
      toolResults.push({ type: "tool_result", tool_use_id: toolCall.id, content: result });
    }

    // Add assistant message (with tool_use blocks) and user message (with tool_results) to conversation
    conversationMessages = [
      ...conversationMessages,
      { role: "assistant", content: data.content },
      { role: "user", content: toolResults },
    ];
  }

  return {
    content: finalText,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
  };
}

// ─── Moonshot/Kimi with tool calling (OpenAI format) ────

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

function toolsToOpenAIFormat(tools: ToolDefinition[]): {
  type: "function";
  function: { name: string; description: string; parameters: ToolDefinition["input_schema"] };
}[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

async function callMoonshotWithTools(
  apiKey: string,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const tools = getAllTools();
  const openaiTools = tools.length > 0 ? toolsToOpenAIFormat(tools) : undefined;

  let conversationMessages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: Record<string, unknown> = {
      model: "kimi-k2.5",
      messages: conversationMessages,
      max_tokens: 4096,
    };
    if (openaiTools && openaiTools.length > 0) {
      body.tools = openaiTools;
    }

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Moonshot error:", await response.text());
      return { content: "Er ging iets mis. Probeer het opnieuw.", tokensIn: totalTokensIn, tokensOut: totalTokensOut };
    }

    const data = await response.json() as {
      choices: { message: { content: string | null; tool_calls?: OpenAIToolCall[] }; finish_reason: string }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    totalTokensIn += data.usage?.prompt_tokens ?? 0;
    totalTokensOut += data.usage?.completion_tokens ?? 0;

    const choice = data.choices[0];
    if (choice.message.content) {
      finalText += choice.message.content;
    }

    // If no tool calls, we're done
    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      break;
    }

    // Add assistant message with tool_calls
    conversationMessages.push({
      role: "assistant",
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
    });

    // Execute tools and add results
    for (const tc of choice.message.tool_calls) {
      console.log(`[Tool/Kimi] Executing: ${tc.function.name}`, tc.function.arguments);
      const tool = getTool(tc.function.name);
      let result: string;
      if (tool) {
        try {
          const input = JSON.parse(tc.function.arguments);
          result = await tool.execute(input);
        } catch (err) {
          result = `Tool fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
        }
      } else {
        result = `Tool "${tc.function.name}" niet gevonden.`;
      }
      console.log(`[Tool/Kimi] Result (${tc.function.name}):`, result.slice(0, 200));

      conversationMessages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
      });
    }
  }

  return {
    content: finalText,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
  };
}

// ─── Streaming with agentic tool loop ───────────────────

function resolveAnthropicModel(model: string): string {
  const modelMap: Record<string, string> = {
    "claude-sonnet-4": "claude-sonnet-4-20250514",
    "claude-haiku-4": "claude-haiku-4-5-20251001",
    "claude-opus-4": "claude-opus-4-20250514",
  };
  return modelMap[model] ?? "claude-sonnet-4-20250514";
}

async function streamAnthropicWithTools(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[],
  tools: ToolDefinition[],
  onChunk: (text: string) => Promise<void>,
  onToolUse: (toolName: string, toolInput: Record<string, unknown>) => Promise<void>,
  onUsage: (usage: { inputTokens: number; outputTokens: number }) => void
): Promise<void> {
  const anthropicTools = tools.length > 0 ? toolsToAnthropicFormat(tools) : undefined;

  let conversationMessages: AnthropicMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" as const : "user" as const,
    content: m.content,
  }));

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const body: Record<string, unknown> = {
      model: resolveAnthropicModel(model),
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: conversationMessages,
    };
    if (anthropicTools && anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic streaming error:", errorText);
      await onChunk("Er ging iets mis. Probeer het opnieuw.");
      return;
    }

    // Parse the streaming response, collecting both text and tool_use blocks
    const { contentBlocks, stopReason } = await parseAnthropicStream(
      response,
      onChunk,
      onUsage
    );

    // If no tool calls, we're done
    const toolUseBlocks = contentBlocks.filter((b): b is AnthropicToolUseBlock => b.type === "tool_use");
    if (stopReason !== "tool_use" || toolUseBlocks.length === 0) {
      return;
    }

    // Execute tools
    const toolResults: AnthropicToolResultBlock[] = [];
    for (const toolCall of toolUseBlocks) {
      console.log(`[Tool] Executing: ${toolCall.name}`, JSON.stringify(toolCall.input));
      await onToolUse(toolCall.name, toolCall.input);

      const tool = getTool(toolCall.name);
      let result: string;
      if (tool) {
        try {
          result = await tool.execute(toolCall.input);
        } catch (err) {
          result = `Tool fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
        }
      } else {
        result = `Tool "${toolCall.name}" niet gevonden.`;
      }
      console.log(`[Tool] Result (${toolCall.name}):`, result.slice(0, 200));
      toolResults.push({ type: "tool_result", tool_use_id: toolCall.id, content: result });
    }

    // Continue conversation with tool results
    conversationMessages = [
      ...conversationMessages,
      { role: "assistant", content: contentBlocks },
      { role: "user", content: toolResults },
    ];

    // Small status message so the user knows what's happening
    await onChunk("\n\n");
  }
}

// Parse Anthropic streaming response, collecting all content blocks
async function parseAnthropicStream(
  response: Response,
  onTextChunk: (text: string) => Promise<void>,
  onUsage: (usage: { inputTokens: number; outputTokens: number }) => void
): Promise<{ contentBlocks: AnthropicContentBlock[]; stopReason: string }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stopReason = "end_turn";

  // Track content blocks being built
  const contentBlocks: AnthropicContentBlock[] = [];
  let currentBlockIndex = -1;
  let currentToolInput = ""; // JSON string being built incrementally

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const event = JSON.parse(data);

        switch (event.type) {
          case "message_start":
            if (event.message?.usage) {
              onUsage({
                inputTokens: event.message.usage.input_tokens,
                outputTokens: event.message.usage.output_tokens ?? 0,
              });
            }
            break;

          case "content_block_start":
            currentBlockIndex = event.index;
            if (event.content_block?.type === "text") {
              contentBlocks[currentBlockIndex] = { type: "text", text: "" };
            } else if (event.content_block?.type === "tool_use") {
              contentBlocks[currentBlockIndex] = {
                type: "tool_use",
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},
              };
              currentToolInput = "";
            }
            break;

          case "content_block_delta":
            if (event.delta?.type === "text_delta" && event.delta.text) {
              const block = contentBlocks[event.index];
              if (block?.type === "text") {
                block.text += event.delta.text;
              }
              await onTextChunk(event.delta.text);
            } else if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
              currentToolInput += event.delta.partial_json;
            }
            break;

          case "content_block_stop": {
            const block = contentBlocks[event.index];
            if (block?.type === "tool_use" && currentToolInput) {
              try {
                block.input = JSON.parse(currentToolInput);
              } catch {
                block.input = {};
              }
              currentToolInput = "";
            }
            break;
          }

          case "message_delta":
            if (event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason;
            }
            if (event.usage) {
              onUsage({ inputTokens: 0, outputTokens: event.usage.output_tokens });
            }
            break;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  return { contentBlocks, stopReason };
}

// ─── Moonshot/Kimi streaming with tool calling ─────────

async function streamMoonshotWithTools(
  apiKey: string,
  systemPrompt: string,
  history: { role: string; content: string }[],
  tools: ToolDefinition[],
  onChunk: (text: string) => Promise<void>,
  onToolUse: (toolName: string) => Promise<void>,
  onUsage: (usage: { inputTokens: number; outputTokens: number }) => void
): Promise<void> {
  const openaiTools = tools.length > 0 ? toolsToOpenAIFormat(tools) : undefined;

  let conversationMessages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const body: Record<string, unknown> = {
      model: "kimi-k2.5",
      messages: conversationMessages,
      max_tokens: 4096,
      stream: true,
    };
    if (openaiTools && openaiTools.length > 0) {
      body.tools = openaiTools;
    }

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Moonshot streaming error:", errorText);
      await onChunk("Er ging iets mis. Probeer het opnieuw.");
      return;
    }

    // Parse streaming response, collecting text and tool calls
    const { text, toolCalls, finishReason } = await parseMoonshotStream(response, onChunk, onUsage);

    // If no tool calls, we're done
    if (finishReason !== "tool_calls" || toolCalls.length === 0) {
      return;
    }

    // Add assistant message with tool calls to conversation
    conversationMessages.push({
      role: "assistant",
      content: text || null,
      tool_calls: toolCalls,
    });

    // Execute tools
    for (const tc of toolCalls) {
      console.log(`[Tool/Kimi] Executing: ${tc.function.name}`, tc.function.arguments);
      await onToolUse(tc.function.name);

      const tool = getTool(tc.function.name);
      let result: string;
      if (tool) {
        try {
          const input = JSON.parse(tc.function.arguments);
          result = await tool.execute(input);
        } catch (err) {
          result = `Tool fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
        }
      } else {
        result = `Tool "${tc.function.name}" niet gevonden.`;
      }
      console.log(`[Tool/Kimi] Result (${tc.function.name}):`, result.slice(0, 200));

      conversationMessages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
      });
    }

    // Add spacing before next response
    await onChunk("\n\n");
  }
}

async function parseMoonshotStream(
  response: Response,
  onTextChunk: (text: string) => Promise<void>,
  onUsage: (usage: { inputTokens: number; outputTokens: number }) => void
): Promise<{ text: string; toolCalls: OpenAIToolCall[]; finishReason: string }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let finishReason = "stop";

  // Collect tool calls from streamed deltas
  const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const event = JSON.parse(data);
        const choice = event.choices?.[0];

        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }

        // Text content
        const delta = choice?.delta?.content;
        if (delta) {
          text += delta;
          await onTextChunk(delta);
        }

        // Tool call deltas (OpenAI streaming format)
        const tcDeltas = choice?.delta?.tool_calls;
        if (tcDeltas) {
          for (const tcd of tcDeltas) {
            const idx = tcd.index ?? 0;
            if (!toolCallMap.has(idx)) {
              toolCallMap.set(idx, { id: tcd.id ?? "", name: "", arguments: "" });
            }
            const tc = toolCallMap.get(idx)!;
            if (tcd.id) tc.id = tcd.id;
            if (tcd.function?.name) tc.name += tcd.function.name;
            if (tcd.function?.arguments) tc.arguments += tcd.function.arguments;
          }
        }

        // Usage
        if (event.usage) {
          onUsage({
            inputTokens: event.usage.prompt_tokens ?? 0,
            outputTokens: event.usage.completion_tokens ?? 0,
          });
        }
      } catch {
        // Skip unparseable
      }
    }
  }

  const toolCalls: OpenAIToolCall[] = Array.from(toolCallMap.values()).map((tc) => ({
    id: tc.id,
    type: "function" as const,
    function: { name: tc.name, arguments: tc.arguments },
  }));

  return { text, toolCalls, finishReason };
}
