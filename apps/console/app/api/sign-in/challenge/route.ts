import { NextResponse } from "next/server";
import { isSessionConfigured, issueChallenge } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues a one-time sign-in challenge and drops the HttpOnly challenge
 * cookie. Called by the sign-in form on mount.
 *
 * Why this lives in a route handler instead of the /sign-in server
 * component: Next.js 15 disallows `cookies().set()` from inside a
 * server-component render. The challenge cookie has to be written from
 * a Route Handler or Server Action. Keeping the form's state machine
 * simple, the client fetches this on mount → gets `{nonce, expiresAt}`
 * → user pastes secret → signs nonce → POSTs to /api/sign-in.
 */
export async function GET() {
  if (!isSessionConfigured()) {
    return NextResponse.json(
      { error: "not_configured" },
      { status: 503 }
    );
  }

  const { nonce, expiresAt } = await issueChallenge();
  return NextResponse.json(
    { nonce, expiresAt },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
