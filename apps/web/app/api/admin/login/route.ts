import { NextResponse, type NextRequest } from "next/server";
import { setAdminCookie, verifyPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { password?: string };

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const password = body.password ?? "";
  if (!verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
