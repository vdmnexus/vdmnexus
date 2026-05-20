import { type NextRequest, NextResponse } from "next/server";
import { verifyReceipt } from "@vdm-nexus/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  receipt?: unknown;
  prompt?: unknown;
  response?: unknown;
};

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      route: "playground.verify",
      event,
      ...fields,
    })
  );
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  log("request.start", { request_id: requestId });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    log("invalid_json", { request_id: requestId });
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (
    body.receipt === undefined ||
    body.receipt === null ||
    typeof body.receipt !== "object" ||
    body.prompt === undefined ||
    body.response === undefined
  ) {
    log("invalid_body", {
      request_id: requestId,
      has_receipt: body.receipt !== undefined && body.receipt !== null,
      has_prompt: body.prompt !== undefined,
      has_response: body.response !== undefined,
    });
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await verifyReceipt({
      receipt: body.receipt,
      prompt: body.prompt,
      response: body.response,
    } as Parameters<typeof verifyReceipt>[0]);

    log("verify.complete", { request_id: requestId, ok: result.ok });
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    log("verify.error", { request_id: requestId, detail });
    return NextResponse.json(
      { error: "verify_error", detail },
      { status: 500 }
    );
  }
}
