import { z } from "zod";
import { Agent } from "@vdm-nexus/sdk";
import {
  X402Agent,
  verifyReceipt,
  X402PaymentRequiredError,
  X402PaymentReplayError,
  X402UpstreamError,
  type ChatMessage,
  type NexusReceipt,
  type OpenAIChatCompletion,
  type X402ChatResponse,
} from "@vdm-nexus/x402";
import type { ServerConfig, PaymentMode } from "./config.js";

const TASK_TYPES = ["fast", "reasoning", "general"] as const;

export const signedInferenceInput = {
  prompt: z.string().min(1).describe("Prompt text to send to the model."),
  model: z
    .string()
    .optional()
    .describe(
      "Model slug (OpenRouter-style, e.g. \"openai/gpt-4o-mini\"). Used in x402 mode."
    ),
  max_cost_usdc: z
    .number()
    .positive()
    .optional()
    .describe(
      "Max acceptable cost in USDC. Prepaid mode only — hints at routing."
    ),
  task_type: z
    .enum(TASK_TYPES)
    .optional()
    .describe(
      "Routing hint for prepaid mode: \"fast\", \"reasoning\", or \"general\"."
    ),
  mode: z
    .enum(["prepaid", "x402"])
    .optional()
    .describe(
      "Override the server's default payment mode for this call."
    ),
};

export const verifyReceiptInput = {
  receipt: z
    .record(z.string(), z.unknown())
    .describe("The SIR v2 receipt object returned by signed_inference."),
  prompt: z
    .union([
      z.string(),
      z.array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })
      ),
    ])
    .describe(
      "The prompt the receipt covers. String for prepaid receipts; ChatMessage[] for x402."
    ),
  response: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .describe(
      "The response the receipt covers. String for prepaid; OpenAI chat-completion object for x402."
    ),
};

function textBlock(text: string) {
  return { type: "text" as const, text };
}

function jsonBlock(value: unknown) {
  return textBlock(JSON.stringify(value, null, 2));
}

function errorResult(message: string, detail?: unknown) {
  const payload =
    detail === undefined ? { error: message } : { error: message, detail };
  return {
    isError: true,
    content: [jsonBlock(payload)],
  };
}

function requireAgentSecret(config: ServerConfig): string {
  if (!config.agentSecretKey) {
    throw new Error(
      "NEXUS_AGENT_SECRET_KEY is not set. Set the env var to a base58-encoded 64-byte Ed25519 secret to use signed_inference."
    );
  }
  return config.agentSecretKey;
}

async function runPrepaid(
  config: ServerConfig,
  args: {
    prompt: string;
    task_type?: (typeof TASK_TYPES)[number];
    max_cost_usdc?: number;
  }
) {
  const agent = Agent.fromBase58(requireAgentSecret(config));
  const res = await agent.inference(config.endpoint, {
    prompt: args.prompt,
    task_type: args.task_type,
    max_cost_usdc: args.max_cost_usdc,
  });
  if (!res.ok) {
    return errorResult(res.error ?? "inference_failed", res.detail);
  }
  const out = {
    mode: "prepaid" as const,
    agent_pubkey: agent.pubkey,
    result: res.result,
    receipt: res.receipt,
  };
  return {
    content: [jsonBlock(out)],
    structuredContent: out as Record<string, unknown>,
  };
}

async function runX402(
  config: ServerConfig,
  args: { prompt: string; model?: string }
) {
  const agent = X402Agent.fromBase58(requireAgentSecret(config));
  const messages: ChatMessage[] = [{ role: "user", content: args.prompt }];
  let res: X402ChatResponse;
  try {
    res = await agent.payAndInfer(config.endpoint, {
      model: args.model ?? config.defaultModel,
      messages,
    });
  } catch (e) {
    if (e instanceof X402PaymentRequiredError) {
      return errorResult("x402_payment_invalid", e.detail);
    }
    if (e instanceof X402PaymentReplayError) {
      return errorResult("x402_payment_replay");
    }
    if (e instanceof X402UpstreamError) {
      return errorResult("x402_upstream_error", {
        status: e.status,
        detail: e.detail,
      });
    }
    throw e;
  }
  const out = {
    mode: "x402" as const,
    agent_pubkey: agent.pubkey,
    result: res.openai.choices?.[0]?.message?.content ?? "",
    openai: res.openai,
    receipt: res.receipt,
    payment: res.payment,
  };
  return {
    content: [jsonBlock(out)],
    structuredContent: out as Record<string, unknown>,
  };
}

export function pickMode(
  config: ServerConfig,
  override?: PaymentMode
): PaymentMode {
  return override ?? config.paymentMode;
}

export async function signedInferenceHandler(
  config: ServerConfig,
  args: {
    prompt: string;
    model?: string;
    max_cost_usdc?: number;
    task_type?: (typeof TASK_TYPES)[number];
    mode?: PaymentMode;
  }
) {
  const mode = pickMode(config, args.mode);
  if (mode === "x402") {
    return runX402(config, { prompt: args.prompt, model: args.model });
  }
  return runPrepaid(config, {
    prompt: args.prompt,
    task_type: args.task_type,
    max_cost_usdc: args.max_cost_usdc,
  });
}

export async function verifyReceiptHandler(
  config: ServerConfig,
  args: {
    receipt: Record<string, unknown>;
    prompt: string | ChatMessage[];
    response: string | Record<string, unknown>;
  }
) {
  let result;
  try {
    result = await verifyReceipt({
      receipt: args.receipt as unknown as NexusReceipt,
      prompt: args.prompt,
      response: args.response as string | OpenAIChatCompletion,
      endpoint: config.operatorKey ? undefined : endpointRoot(config.endpoint),
      operatorKey: config.operatorKey ?? undefined,
      rpc: config.solanaRpcUrl ?? undefined,
    });
  } catch (e) {
    return errorResult("verify_failed", (e as Error).message);
  }
  return {
    content: [jsonBlock(result)],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

/**
 * `verifyReceipt` wants the endpoint base (e.g. https://nexus.vdmnexus.com)
 * and appends `/api/v1/operator-key`. Our config holds the `/api/v1` URL,
 * so strip the suffix.
 */
function endpointRoot(endpoint: string): string {
  return endpoint.replace(/\/api\/v1\/?$/, "");
}
