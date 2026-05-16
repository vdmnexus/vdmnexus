export type InferenceParams = {
  model: string;
  prompt: string;
};

export type InferenceResult = {
  text: string;
  model: string;
  upstream: "openrouter";
  prompt_tokens: number;
  completion_tokens: number;
  cost_usdc: number;
  latency_ms: number;
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
  choices: Array<{ message: { content: string } }>;
  usage: OpenRouterUsage;
};

export async function runInference(
  params: InferenceParams
): Promise<InferenceResult> {
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
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
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

  return {
    text: choice.message.content,
    model: data.model,
    upstream: "openrouter",
    prompt_tokens: data.usage.prompt_tokens,
    completion_tokens: data.usage.completion_tokens,
    cost_usdc: Number(data.usage.cost ?? 0),
    latency_ms,
  };
}
