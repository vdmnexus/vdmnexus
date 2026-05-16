import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { scanDeposits } from "@/lib/deposits";
import { credit, ensureAgent } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function defaultUsdcMint(): string {
  return process.env.SOLANA_NETWORK === "mainnet-beta"
    ? USDC_MAINNET
    : USDC_DEVNET;
}

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === expected) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  return false;
}

async function scan() {
  const depositAddress = process.env.NEXUS_DEPOSIT_ADDRESS;
  if (!depositAddress) {
    return NextResponse.json(
      { ok: false, error: "deposit_address_not_set" },
      { status: 500 }
    );
  }
  const usdcMint = process.env.NEXUS_USDC_MINT ?? defaultUsdcMint();
  const limit = Number(process.env.NEXUS_DEPOSIT_SCAN_LIMIT ?? 50);

  const matches = await scanDeposits({ depositAddress, usdcMint, limit });
  if (matches.length === 0) {
    return NextResponse.json({ ok: true, scanned: limit, credited: 0, skipped: 0 });
  }

  const supabase = getServiceClient();
  let credited = 0;
  let skipped = 0;

  for (const m of matches) {
    try {
      await ensureAgent(supabase, m.sender);
      await credit(supabase, {
        pubkey: m.sender,
        usdc: m.amount_usdc,
        reason: "deposit",
        tx_signature: m.tx_signature,
      });
      credited++;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "23505") {
        skipped++;
      } else {
        console.error("[deposits] credit failed", m.tx_signature, e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: limit,
    credited,
    skipped,
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return scan();
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return scan();
}
