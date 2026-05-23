import { type NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashIp, getClientIp } from "@/lib/ip-hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Enterprise inquiries are higher-stakes than waitlist signups, so
// the limits are stricter: 3 submissions per 24h per IP.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 2000;
const MAX_REFERRER_LEN = 500;
const MAX_UA_LEN = 500;

type Body = {
  email?: string;
  contact_name?: string | null;
  company?: string | null;
  role?: string | null;
  use_case?: string;
  sla_requirements?: string | null;
  volume_estimate?: string | null;
  timeline?: string | null;
  regulatory_context?: string | null;
  source_path?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  // Honeypot.
  website?: string;
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

  // Honeypot: silently accept and discard bot submissions.
  if (body.website && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const useCase = clip(body.use_case, MAX_LONG);
  if (!useCase) {
    return NextResponse.json({ ok: false, error: "missing_use_case" }, { status: 400 });
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
    .from("enterprise_inquiry_rate_limit")
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
        .from("enterprise_inquiry_rate_limit")
        .update({ count: (rl.count as number) + 1 })
        .eq("ip_hash", ipHash);
    } else {
      await supabase
        .from("enterprise_inquiry_rate_limit")
        .update({ count: 1, window_start: now.toISOString() })
        .eq("ip_hash", ipHash);
    }
  } else {
    await supabase
      .from("enterprise_inquiry_rate_limit")
      .insert({ ip_hash: ipHash, count: 1, window_start: now.toISOString() });
  }

  const insert = {
    email,
    contact_name: clip(body.contact_name, MAX_SHORT),
    company: clip(body.company, MAX_SHORT),
    role: clip(body.role, MAX_SHORT),
    use_case: useCase,
    sla_requirements: clip(body.sla_requirements, MAX_MEDIUM),
    volume_estimate: clip(body.volume_estimate, MAX_SHORT),
    timeline: clip(body.timeline, MAX_SHORT),
    regulatory_context: clip(body.regulatory_context, MAX_MEDIUM),
    source_path: clip(body.source_path, MAX_SHORT) ?? "/pricing",
    utm_source: clip(body.utm_source, MAX_SHORT),
    utm_medium: clip(body.utm_medium, MAX_SHORT),
    utm_campaign: clip(body.utm_campaign, MAX_SHORT),
    referrer: clip(body.referrer, MAX_REFERRER_LEN),
    ip_hash: ipHash,
    user_agent: clip(req.headers.get("user-agent"), MAX_UA_LEN),
  };

  const { error } = await supabase.from("enterprise_inquiries").insert(insert);
  if (error) {
    console.error("[enterprise-inquiry] insert error", error);
    return NextResponse.json(
      { ok: false, error: "insert_failed" },
      { status: 500 }
    );
  }

  void notifySlack({
    email,
    company: insert.company,
    contact_name: insert.contact_name,
    use_case: useCase,
    sla_requirements: insert.sla_requirements,
    regulatory_context: insert.regulatory_context,
  });

  return NextResponse.json({ ok: true });
}

async function notifySlack(row: {
  email: string;
  company: string | null;
  contact_name: string | null;
  use_case: string;
  sla_requirements: string | null;
  regulatory_context: string | null;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    const headline =
      row.company && row.contact_name
        ? `*${row.contact_name}* — ${row.company} (\`${row.email}\`)`
        : row.company
          ? `${row.company} (\`${row.email}\`)`
          : row.contact_name
            ? `*${row.contact_name}* (\`${row.email}\`)`
            : `\`${row.email}\``;

    const lines: string[] = [
      `🏢 enterprise inquiry — ${headline}`,
      `> ${row.use_case.slice(0, 600)}`,
    ];
    if (row.sla_requirements) {
      lines.push(`*SLA:* ${row.sla_requirements.slice(0, 400)}`);
    }
    if (row.regulatory_context) {
      lines.push(`*Regulatory:* ${row.regulatory_context.slice(0, 400)}`);
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch (e) {
    console.error("[enterprise-inquiry] slack error", e);
  }
}
