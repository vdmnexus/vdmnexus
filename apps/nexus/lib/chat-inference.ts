/**
 * OpenAI-shape inference for the x402-gated /chat/completions endpoint.
 *
 * Mirrors apps/nexus/lib/inference.ts but accepts and returns the full
 * OpenAI chat-completions shape, so the response can be passed through to
 * clients with minimal mapping.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatInferenceParams = {
  /** OpenRouter model slug (e.g. "openai/gpt-4o-mini"). */
  upstreamModel: string;
  messages: ChatMessage[];
};

export type OpenAIChatCompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type ChatInferenceResult = {
  /** OpenAI-shape response body to pass back to the client. */
  openaiResponse: OpenAIChatCompletionResponse;
  /** Internal: real cost the upstream provider charged us, in USDC. */
  cost_usdc: number;
  /** Internal: prompt + completion token counts for inference_logs. */
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  upstream: "openrouter";
};

type OpenRouterChoice = {
  index: number;
  message: { role: "assistant"; content: string };
  finish_reason: string | null;
};

type OpenRouterUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
};

type OpenRouterResponse = {
  id: string;
  model: string;
  created: number;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
};

export async function runChatInference(
  params: ChatInferenceParams
): Promise<ChatInferenceResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is required");

  const startedAt = Date.now();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vdmnexus.com",
      "X-Title": "VDM Nexus",
    },
    body: JSON.stringify({
      model: params.upstreamModel,
      messages: params.messages,
      usage: { include: true },
    }),
  });

  const latency_ms = Date.now() - startedAt;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`openrouter ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  const choice = data.choices[0];
  if (!choice) throw new Error("openrouter returned no choices");

  const openaiResponse: OpenAIChatCompletionResponse = {
    id: data.id,
    object: "chat.completion",
    created: data.created,
    model: data.model,
    choices: data.choices.map((c) => ({
      index: c.index,
      message: c.message,
      finish_reason: c.finish_reason ?? "stop",
    })),
    usage: {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
    },
  };

  return {
    openaiResponse,
    cost_usdc: Number(data.usage.cost ?? 0),
    prompt_tokens: data.usage.prompt_tokens,
    completion_tokens: data.usage.completion_tokens,
    latency_ms,
    upstream: "openrouter",
  };
}
