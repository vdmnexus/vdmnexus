import { NextRequest, NextResponse } from "next/server";
import { verifyReceipt } from "@vdm-nexus/x402";
import type {
  ChatMessage,
  NexusReceipt,
  OpenAIChatCompletion,
} from "@vdm-nexus/x402";
import {
  getVerifierPublicKeyBase58,
  signResult,
} from "@/lib/verifier-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
} as const;

const DEFAULT_NEXUS_ENDPOINT =
  process.env.NEXUS_DEFAULT_ENDPOINT?.trim() || "https://nexus.vdmnexus.com";

type VerifyRequestBody = {
  receipt?: unknown;
  prompt?: unknown;
  response?: unknown;
  endpoint?: unknown;
  operatorKey?: unknown;
  rpc?: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isChatMessageArray(v: unknown): v is ChatMessage[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (m) =>
      isRecord(m) &&
      typeof m.role === "string" &&
      (m.role === "system" || m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
  );
}

function badRequest(detail: string) {
  return NextResponse.json(
    { ok: false, error: "invalid_request", detail },
    { status: 400, headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: VerifyRequestBody;
  try {
    body = (await req.json()) as VerifyRequestBody;
  } catch {
    return badRequest("body must be valid JSON");
  }

  if (!isRecord(body.receipt)) return badRequest("receipt must be an object");
  if (!isChatMessageArray(body.prompt))
    return badRequest("prompt must be an array of { role, content }");
  if (!isRecord(body.response))
    return badRequest("response must be an OpenAI chat-completion object");

  const endpoint =
    typeof body.endpoint === "string" && body.endpoint.length > 0
      ? body.endpoint
      : DEFAULT_NEXUS_ENDPOINT;
  const operatorKey =
    typeof body.operatorKey === "string" && body.operatorKey.length > 0
      ? body.operatorKey
      : undefined;
  const rpc =
    typeof body.rpc === "string" && body.rpc.length > 0 ? body.rpc : undefined;

  const receipt = body.receipt as unknown as NexusReceipt;
  const prompt = body.prompt;
  const response = body.response as unknown as OpenAIChatCompletion;

  let inner;
  try {
    inner = await verifyReceipt({
      receipt,
      prompt,
      response,
      endpoint,
      operatorKey,
      rpc,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "verify_failed";
    return NextResponse.json(
      { ok: false, error: "upstream_error", detail },
      { status: 502, headers: CORS_HEADERS }
    );
  }

  let verifierPubkey: string;
  try {
    verifierPubkey = getVerifierPublicKeyBase58();
  } catch (e) {
    const detail = e instanceof Error ? e.message : "server_misconfigured";
    return NextResponse.json(
      { ok: false, error: "server_misconfigured", detail },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const unsigned = {
    v: 1 as const,
    ok: inner.ok,
    checks: inner.checks,
    receipt_signature: receipt.nexus_signature ?? null,
    verified_at: Date.now(),
    verifier_pubkey: verifierPubkey,
  };

  const signed = signResult(unsigned);

  return NextResponse.json(signed, { status: 200, headers: CORS_HEADERS });
}
