import { type NextRequest, NextResponse } from "next/server";
import { Agent, type InferenceResponse } from "@vdm-nexus/sdk";
import { hashIp, getClientIp } from "@/lib/ip-hash";
import { checkRateLimit } from "@/lib/playground/rate-limit";
import {
  getSponsorAgent,
  checkDailyBudget,
} from "@/lib/playground/sponsor-agent";
import { saveReceipt } from "@/lib/playground/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT_LEN = 4000;
const VALID_TASK_TYPES = new Set(["fast", "reasoning", "general"] as const);
type TaskType = "fast" | "reasoning" | "general";

type Body = {
  prompt?: unknown;
  task_type?: unknown;
};

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      route: "playground.inference",
      event,
      ...fields,
    })
  );
}

function jsonError(
  event: string,
  error: string,
  status: number,
  fields: Record<string, unknown> = {},
  extra?: Record<string, unknown>
) {
  log(event, { ...fields, error, status });
  return NextResponse.json({ error, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  log("request.start", { request_id: requestId });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("invalid_json", "invalid_json", 400, {
      request_id: requestId,
    });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (prompt.length === 0) {
    return jsonError("invalid_prompt", "invalid_prompt", 400, {
      request_id: requestId,
      reason: "empty",
    });
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return jsonError("invalid_prompt", "invalid_prompt", 400, {
      request_id: requestId,
      reason: "too_long",
      length: prompt.length,
    });
  }

  let taskType: TaskType = "general";
  if (body.task_type !== undefined) {
    if (
      typeof body.task_type !== "string" ||
      !VALID_TASK_TYPES.has(body.task_type as TaskType)
    ) {
      return jsonError("invalid_task_type", "invalid_task_type", 400, {
        request_id: requestId,
      });
    }
    taskType = body.task_type as TaskType;
  }

  const ipHash = hashIp(getClientIp(req));

  try {
    const rl = await checkRateLimit(ipHash);
    if (!rl.allowed) {
      log("rate_limited", {
        request_id: requestId,
        retry_after_ms: rl.retry_after_ms,
      });
      return NextResponse.json(
        { error: "rate_limited", retry_after_ms: rl.retry_after_ms },
        { status: 429 }
      );
    }
  } catch (e) {
    log("rate_limit.error", {
      request_id: requestId,
      detail: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "internal_error", detail: "rate_limit_unavailable" },
      { status: 500 }
    );
  }

  try {
    const budget = await checkDailyBudget();
    if (!budget.ok) {
      log("daily_budget_exceeded", { request_id: requestId });
      return NextResponse.json(
        { error: "daily_budget_exceeded" },
        { status: 503 }
      );
    }
  } catch (e) {
    log("daily_budget.error", {
      request_id: requestId,
      detail: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "internal_error", detail: "budget_unavailable" },
      { status: 500 }
    );
  }

  let upstream: InferenceResponse;
  try {
    const sponsor = await getSponsorAgent();
    const agent = new Agent(sponsor.secretKey);
    const endpoint =
      process.env.NEXUS_INFERENCE_URL ?? "https://nexus.vdmnexus.com/api/v1";

    log("upstream.start", {
      request_id: requestId,
      sponsor_pubkey: sponsor.pubkey,
      endpoint,
      task_type: taskType,
      prompt_len: prompt.length,
    });

    upstream = await agent.inference(endpoint, {
      prompt,
      task_type: taskType,
      // The playground sponsor agent is operator-funded; never let it
      // claim a sponsored grant if its balance drops. A zero-balance
      // sponsor should surface as a real error so we top it up, not
      // silently absorb the $0.10 grant and keep serving.
      autoGrant: false,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    log("upstream.error", { request_id: requestId, detail });
    return NextResponse.json(
      { error: "upstream_error", detail },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.result || !upstream.receipt) {
    log("upstream.not_ok", {
      request_id: requestId,
      upstream_error: upstream.error,
      upstream_detail: upstream.detail,
    });
    return NextResponse.json(
      {
        error: "upstream_error",
        detail: upstream.error ?? upstream.detail ?? "upstream_returned_not_ok",
      },
      { status: 502 }
    );
  }

  let id: string;
  try {
    id = await saveReceipt(prompt, upstream.result, upstream.receipt, ipHash);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    log("storage.error", { request_id: requestId, detail });
    return NextResponse.json(
      { error: "internal_error", detail: "storage_unavailable" },
      { status: 500 }
    );
  }

  log("request.complete", {
    request_id: requestId,
    id,
    duration_ms: Date.now() - startedAt,
    cost_usdc: upstream.receipt.cost_usdc,
    model: upstream.receipt.model,
  });

  return NextResponse.json({
    id,
    permalink: `/r/${id}`,
    result: upstream.result,
    receipt: upstream.receipt,
  });
}
