import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export async function GET() {
  const address = process.env.NEXUS_DEPOSIT_ADDRESS;
  if (!address) {
    return NextResponse.json(
      { ok: false, error: "deposit_address_not_set" },
      { status: 503 }
    );
  }
  const network = process.env.SOLANA_NETWORK ?? "devnet";
  const mint =
    process.env.NEXUS_USDC_MINT ??
    (network === "mainnet-beta" ? USDC_MAINNET : USDC_DEVNET);
  return NextResponse.json({ ok: true, network, address, mint });
}
