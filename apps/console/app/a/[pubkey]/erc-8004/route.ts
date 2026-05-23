import { NextResponse } from "next/server";
import { loadAgentProfile, PUBKEY_REGEX } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ERC-8004 agent card — JSON description that lets other agents discover
 * this agent's endpoint, payment terms, and signature scheme.
 *
 * v0: static synthesis from existing Supabase data. No on-chain
 * registration in this PR — the JSON shape is what a future on-chain
 * registration would point at via tokenURI.
 *
 * Reference: ERC-8004 (Coinbase / MetaMask / EF / Google co-authored),
 * live on Ethereum mainnet 29 Jan 2026.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await ctx.params;

  if (!PUBKEY_REGEX.test(pubkey)) {
    return NextResponse.json(
      { error: "invalid_pubkey" },
      { status: 400 }
    );
  }

  const data = await loadAgentProfile(pubkey);

  const nexusBase =
    process.env.NEXT_PUBLIC_NEXUS_URL ?? "https://nexus.vdmnexus.com";

  const card = {
    schema: "https://eips.ethereum.org/EIPS/eip-8004",
    version: "0.1",
    agent: {
      id: `did:key:solana:${pubkey}`,
      name: data?.label ?? `Nexus agent ${pubkey.slice(0, 6)}`,
      description:
        "Ed25519 agent on the VDM Nexus signed-inference rail. Every call to the declared endpoint produces a verifiable receipt (SIR v2).",
    },
    endpoints: [
      {
        type: "openai-chat-completions",
        url: `${nexusBase}/api/v1/chat/completions`,
        description:
          "OpenAI-compatible /chat/completions endpoint. x402 v2 settles per-call USDC payment; the response carries an Ed25519-signed receipt.",
      },
    ],
    payment: {
      address: pubkey,
      network: "solana:mainnet",
      asset: "USDC",
      asset_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      scheme: "x402-v2",
      networks: [
        {
          chain: "solana:mainnet",
          asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        },
        {
          chain: "eip155:8453",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        },
      ],
    },
    signature: {
      scheme: "ed25519",
      public_key: pubkey,
      encoding: "base58",
    },
    receipt: {
      format: "SIR v2",
      spec: "https://docs.vdmnexus.com/spec/sir-v2",
      operator_key: `${nexusBase}/api/v1/operator-key`,
      verifier: "https://verify.vdmnexus.com",
    },
    profile: {
      public: `https://console.vdmnexus.com/a/${pubkey}`,
      points: `https://vdmnexus.com/points/${pubkey}`,
    },
  };

  return NextResponse.json(card, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
