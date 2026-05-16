export type TaskType = "fast" | "reasoning" | "general";

export type Route = {
  /** User-facing provider label printed on the receipt. */
  provider: "groq" | "anthropic" | "openai";
  /** User-facing model label printed on the receipt. */
  model: string;
  /** Actual OpenRouter model slug used for the upstream call. */
  upstreamModel: string;
};

const ROUTES: Record<TaskType, Route> = {
  fast: {
    provider: "groq",
    model: "llama-3-70b",
    upstreamModel: "meta-llama/llama-3-70b-instruct",
  },
  reasoning: {
    provider: "anthropic",
    model: "claude-haiku",
    upstreamModel: "anthropic/claude-3-haiku",
  },
  general: {
    provider: "openai",
    model: "gpt-4o-mini",
    upstreamModel: "openai/gpt-4o-mini",
  },
};

const VALID: TaskType[] = ["fast", "reasoning", "general"];

export function isTaskType(v: unknown): v is TaskType {
  return typeof v === "string" && (VALID as string[]).includes(v);
}

export function route(taskType: TaskType, maxCostUsd?: number): Route {
  if (
    taskType === "fast" ||
    (typeof maxCostUsd === "number" && maxCostUsd < 0.001)
  ) {
    return ROUTES.fast;
  }
  if (taskType === "reasoning") return ROUTES.reasoning;
  return ROUTES.general;
}
