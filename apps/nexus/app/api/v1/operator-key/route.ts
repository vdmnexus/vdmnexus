import { NextResponse } from "next/server";
import { getOperatorPublicKeyBase58 } from "@/lib/receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      pubkey: getOperatorPublicKeyBase58(),
      algorithm: "ed25519",
      encoding: "base58",
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "operator_key_unavailable";
    return NextResponse.json(
      { ok: false, error: "operator_key_unavailable", detail },
      { status: 500 }
    );
  }
}
