import { type NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashIp, getClientIp } from "@/lib/ip-hash";

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
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You're on the VDM Nexus waitlist</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0e0e18;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="padding:36px 36px 8px 36px;text-align:left;">
                <img src="https://vdmnexus.com/logo.png" alt="VDM Nexus" width="140" style="display:block;height:auto;max-width:140px;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0 36px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#0e0e18;line-height:1.25;letter-spacing:-0.01em;">
                  You're on the list.
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                  Thanks for signing up. We're building signed inference for the agent economy &mdash; agents authenticate with a Solana keypair, sign every request, and the response carries a cryptographic receipt anyone can verify. Live on Solana mainnet today. No API keys.
                </p>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#374151;">
                  We'll be in touch as we onboard the first cohort. If you want to skip the queue, just reply to this email and tell us what you're building.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                  <tr>
                    <td style="background:#6366f1;border-radius:8px;">
                      <a href="https://vdmnexus.com/roadmap" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.005em;">
                        See the live roadmap &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px 28px 36px;">
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px 0;" />
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                  VDM Nexus &middot; <a href="https://vdmnexus.com" style="color:#6366f1;text-decoration:none;">vdmnexus.com</a> &middot; <a href="https://x.com/vdmnexus" style="color:#6366f1;text-decoration:none;">@vdmnexus</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
