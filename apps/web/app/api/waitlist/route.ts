import { type NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_FIELD_LEN = 200;
const MAX_REFERRER_LEN = 500;
const MAX_UA_LEN = 500;

type Body = {
  email?: string;
  building?: string | null;
  website?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
};

let cached: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "vdm-fallback-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0];
    if (first) return first.trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function clip(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: silently accept and discard
  if (body.website && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "service_unavailable" },
      { status: 503 }
    );
  }

  const ipHash = hashIp(getClientIp(req));
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data: rl } = await supabase
    .from("waitlist_rate_limit")
    .select("count, window_start")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (rl) {
    const rlStart = new Date(rl.window_start as string);
    if (rlStart > windowCutoff) {
      if ((rl.count as number) >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { ok: false, error: "rate_limited" },
          { status: 429 }
        );
      }
      await supabase
        .from("waitlist_rate_limit")
        .update({ count: (rl.count as number) + 1 })
        .eq("ip_hash", ipHash);
    } else {
      await supabase
        .from("waitlist_rate_limit")
        .update({ count: 1, window_start: now.toISOString() })
        .eq("ip_hash", ipHash);
    }
  } else {
    await supabase
      .from("waitlist_rate_limit")
      .insert({ ip_hash: ipHash, count: 1, window_start: now.toISOString() });
  }

  const insert = {
    email,
    building: clip(body.building, MAX_FIELD_LEN),
    utm_source: clip(body.utm_source, MAX_FIELD_LEN),
    utm_medium: clip(body.utm_medium, MAX_FIELD_LEN),
    utm_campaign: clip(body.utm_campaign, MAX_FIELD_LEN),
    utm_term: clip(body.utm_term, MAX_FIELD_LEN),
    utm_content: clip(body.utm_content, MAX_FIELD_LEN),
    referrer: clip(body.referrer, MAX_REFERRER_LEN),
    ip_hash: ipHash,
    user_agent: clip(req.headers.get("user-agent"), MAX_UA_LEN),
  };

  const { error } = await supabase.from("waitlist").insert(insert);

  let duplicate = false;
  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message ?? "")) {
      duplicate = true;
    } else {
      console.error("[waitlist] insert error", error);
      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }
  }

  if (!duplicate) {
    void sendConfirmationEmail(email);
    void notifySlack({
      email,
      building: insert.building,
      utm_source: insert.utm_source,
      referrer: insert.referrer,
    });
  }

  return NextResponse.json({ ok: true });
}

async function sendConfirmationEmail(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "You're on the VDM Nexus waitlist",
        html: confirmationHtml(),
      }),
    });
    if (!res.ok) {
      console.error("[waitlist] resend", res.status, await res.text());
    }
  } catch (e) {
    console.error("[waitlist] resend error", e);
  }
}

async function notifySlack(row: {
  email: string;
  building: string | null;
  utm_source: string | null;
  referrer: string | null;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    const parts: string[] = [`\`${row.email}\``];
    if (row.building) parts.push(`_${row.building}_`);
    if (row.utm_source) parts.push(`via *${row.utm_source}*`);
    else if (row.referrer) parts.push(`ref ${row.referrer}`);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🆕 waitlist — ${parts.join(" · ")}` }),
    });
  } catch (e) {
    console.error("[waitlist] slack error", e);
  }
}

function confirmationHtml(): string {
  return `<!doctype html>
<html>
  <body style="background:#080810;color:#f1f5f9;font-family:Inter,system-ui,-apple-system,sans-serif;padding:32px 0;margin:0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="padding:32px 24px;border:1px solid #1e1e2e;border-radius:12px;background:#0e0e18;">
        <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;">VDM Nexus</p>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#f1f5f9;line-height:1.3;">You're on the list.</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
          Thanks for signing up. We're building the infrastructure layer for autonomous AI &mdash;
          smart compute routing today, on-chain agent infrastructure next.
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
          We'll be in touch as we onboard the first cohort. If you want to skip the queue,
          reply to this email and tell us what you're building.
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#64748b;">vdmnexus.com</p>
      </td></tr>
    </table>
  </body>
</html>`;
}
