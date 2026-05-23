import { NextResponse } from "next/server";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  consumeChallenge,
  setSessionCookie,
} from "@/lib/session";
import { PUBKEY_REGEX } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  pubkey?: string;
  nonce?: string;
  signature?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { pubkey, nonce, signature } = body;
  if (
    typeof pubkey !== "string" ||
    typeof nonce !== "string" ||
    typeof signature !== "string"
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (!PUBKEY_REGEX.test(pubkey)) {
    return NextResponse.json({ error: "invalid_pubkey" }, { status: 400 });
  }
  if (!/^[0-9a-f]{64,}$/.test(nonce)) {
    return NextResponse.json({ error: "invalid_nonce" }, { status: 400 });
  }

  const ok = await consumeChallenge(nonce);
  if (!ok) {
    return NextResponse.json(
      { error: "challenge_expired_or_invalid" },
      { status: 401 }
    );
  }

  let pubkeyBytes: Uint8Array;
  let signatureBytes: Uint8Array;
  try {
    pubkeyBytes = bs58.decode(pubkey);
    signatureBytes = bs58.decode(signature);
  } catch {
    return NextResponse.json({ error: "invalid_base58" }, { status: 400 });
  }
  if (pubkeyBytes.length !== 32 || signatureBytes.length !== 64) {
    return NextResponse.json({ error: "invalid_key_length" }, { status: 400 });
  }

  const nonceBytes = Uint8Array.from(
    nonce.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );

  const valid = nacl.sign.detached.verify(
    nonceBytes,
    signatureBytes,
    pubkeyBytes
  );
  if (!valid) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  await setSessionCookie(pubkey);
  return NextResponse.json({ ok: true, pubkey });
}
