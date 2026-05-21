/**
 * POST /api/playground/verify
 *
 * Accepts either:
 *   { receipt, prompt, response }  → full 5-check verifyReceipt
 *   { id }                          → look up the receipt by id, then:
 *                                       - playground row → full verify
 *                                       - inference_logs row → sig-only verify
 *
 * Same return shape in both cases: { ok, checks } from verifyReceipt /
 * verifySignatureOnly. Clients render the checks they got back; sig-only
 * results just have one check (nexus_signature_ok) instead of five.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  verifyReceipt,
  verifySignatureOnly,
  type NexusReceipt,
} from "@vdm-nexus/x402";
import { getServiceClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Solana tx signatures are base58-encoded 64-byte blobs → ~88 chars.
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;
// inference_logs.id is a uuid v4 (8-4-4-4-12 hex with dashes).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  // id-lookup mode
  id?: unknown;
  // direct-verify mode
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

function nexusEndpoint(): string {
  return (
    process.env.NEXUS_INFERENCE_URL?.replace(/\/api\/v1\/?$/, "") ??
    "https://nexus.vdmnexus.com"
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

  // --- id-lookup mode ---
  if (typeof body.id === "string" && body.id.length > 0) {
    const id = body.id;
    const supabase = getServiceClient();

    // 1. Playground short id → full verify with prompt + response.
    const pg = await supabase
      .from("playground_receipts")
      .select("receipt, prompt, response")
      .eq("id", id)
      .maybeSingle();
    if (pg.data) {
      try {
        const result = await verifyReceipt({
          receipt: pg.data.receipt as NexusReceipt,
          prompt: pg.data.prompt as string,
          response: pg.data.response as string,
          endpoint: nexusEndpoint(),
        });
        log("verify.complete", { request_id: requestId, mode: "playground", ok: result.ok });
        return NextResponse.json(result);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        log("verify.error", { request_id: requestId, mode: "playground", detail });
        return NextResponse.json({ error: "verify_error", detail }, { status: 500 });
      }
    }

    // 2. UUID inference_id → signature-only verify on the persisted receipt.
    let receiptRow: { receipt_json: Record<string, unknown> | null } | null = null;
    if (UUID_REGEX.test(id)) {
      const r = await supabase
        .from("inference_logs")
        .select("receipt_json")
        .eq("id", id.toLowerCase())
        .eq("status", "success")
        .maybeSingle();
      receiptRow = r.data as { receipt_json: Record<string, unknown> | null } | null;
    } else if (TX_SIGNATURE_REGEX.test(id)) {
      // 3. Solana tx_signature → signature-only verify.
      const r = await supabase
        .from("inference_logs")
        .select("receipt_json")
        .eq("tx_signature", id)
        .eq("status", "success")
        .maybeSingle();
      receiptRow = r.data as { receipt_json: Record<string, unknown> | null } | null;
    }

    if (!receiptRow?.receipt_json) {
      log("verify.not_found", { request_id: requestId, id });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
      const result = await verifySignatureOnly({
        receipt: receiptRow.receipt_json as NexusReceipt,
        endpoint: nexusEndpoint(),
      });
      log("verify.complete", { request_id: requestId, mode: "sig_only", ok: result.ok });
      return NextResponse.json({ ...result, mode: "signature_only" });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      log("verify.error", { request_id: requestId, mode: "sig_only", detail });
      return NextResponse.json({ error: "verify_error", detail }, { status: 500 });
    }
  }

  // --- direct-verify mode ---
  if (
    body.receipt === undefined ||
    body.receipt === null ||
    typeof body.receipt !== "object" ||
    body.prompt === undefined ||
    body.response === undefined
  ) {
    log("invalid_body", {
      request_id: requestId,
      has_id: body.id !== undefined,
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
      endpoint: nexusEndpoint(),
    } as Parameters<typeof verifyReceipt>[0]);

    log("verify.complete", { request_id: requestId, mode: "direct", ok: result.ok });
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    log("verify.error", { request_id: requestId, mode: "direct", detail });
    return NextResponse.json({ error: "verify_error", detail }, { status: 500 });
  }
}
