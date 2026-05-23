/**
 * ERC-8004 "Trustless Agents" agent card. Served at two well-known
 * paths so both the EIP-canonical name (`/.well-known/agent-registration.json`)
 * and the A2A-protocol alias (`/.well-known/agent-card.json`) resolve.
 *
 * Off-chain card per EIP-8004 — referenced by URI from the on-chain
 * `IdentityRegistry.register()` call. We publish the card today; the
 * on-chain registration is deferred until ChaosChain / the spec
 * authors confirm a canonical Ethereum mainnet contract (only Sepolia
 * is verified live as of 2026-05-23).
 *
 * Once minted on-chain, push the resulting `agentId` + registry
 * contract address into `registrations[]` below and redeploy.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AgentCard = {
  type: string;
  name: string;
  description: string;
  image: string;
  endpoints: Array<{
    name: string;
    endpoint: string;
    version?: string;
  }>;
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
  supportedTrust: string[];
  trustModels: Array<{
    name: string;
    spec: string;
    description: string;
  }>;
  x402Support: boolean;
  active: boolean;
  homepage: string;
  documentation: string;
  source: string;
};

// Solana mainnet deposit address — the recipient wallet for x402
// settlements on the chat-completions endpoint. CAIP-10 form so
// indexers resolve the chain without sniffing.
const SOLANA_MAINNET_GENESIS =
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vehk2";
const SOLANA_DEPOSIT_ADDRESS =
  "4nTiDhEbCFJtfPsi49rPGam8R5azUQNZHpb49CLYxiSv";

// Base mainnet deposit address — distinct from the Solana one; lives
// in the `BASE_DEPOSIT_ADDRESS` env var on the nexus app. If unset
// here, the EVM agentWallet entry is omitted so we don't lie about
// our settlement surface.
const BASE_DEPOSIT_ADDRESS = process.env.BASE_DEPOSIT_ADDRESS?.trim();

function buildCard(): AgentCard {
  const endpoints: AgentCard["endpoints"] = [
    {
      name: "x402",
      endpoint: "https://nexus.vdmnexus.com/api/v1/chat/completions",
      version: "2",
    },
    {
      name: "x402",
      endpoint: "https://nexus.vdmnexus.com/api/v1/inference",
      version: "2",
    },
    {
      name: "web",
      endpoint: "https://vdmnexus.com",
    },
    {
      name: "agentWallet",
      endpoint: `${SOLANA_MAINNET_GENESIS}:${SOLANA_DEPOSIT_ADDRESS}`,
    },
  ];

  if (BASE_DEPOSIT_ADDRESS) {
    endpoints.push({
      name: "agentWallet",
      endpoint: `eip155:8453:${BASE_DEPOSIT_ADDRESS}`,
    });
  }

  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "VDM Nexus",
    description:
      "Signed-inference rail for autonomous AI agents. Pay-per-call LLM access via x402 on Solana mainnet and Base mainnet; every response carries an Ed25519-signed SIR v2 receipt that anyone can re-verify against the operator key published at /api/v1/operator-key.",
    image: "https://vdmnexus.com/icon.svg",
    endpoints,
    // Empty until on-chain registration lands. When minted, push:
    //   { agentId: <token id>, agentRegistry: "eip155:1:<contract>" }
    registrations: [],
    // Canonical EIP-8004 trust enum values + our SIR v2 extension.
    // Tooling that doesn't recognise "sir-v2" will fall through to
    // the documented values; tooling that does will know what receipt
    // format we ship.
    supportedTrust: ["reputation", "sir-v2"],
    // Spec extension — described inline so an indexer that doesn't
    // recognise the `supportedTrust` value can still resolve what
    // SIR v2 means without round-tripping our docs.
    trustModels: [
      {
        name: "sir-v2",
        spec: "https://docs.vdmnexus.com/docs/spec/sir-v2",
        description:
          "Signed Inference Receipt v2 — every chat-completions response includes an Ed25519 signature over the canonical-JSON receipt covering prompt hash, response hash, model, cost, and on-chain payment. Verifiable end-to-end without trusting Nexus.",
      },
    ],
    x402Support: true,
    active: true,
    homepage: "https://vdmnexus.com",
    documentation: "https://docs.vdmnexus.com",
    source: "https://github.com/vdmnexus/vdmnexus",
  };
}

export async function GET(): Promise<NextResponse> {
  const card = buildCard();
  return NextResponse.json(card, {
    headers: {
      // Long edge cache — the card is stable. Bust by redeploy.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      // CORS open — agent card indexers fetch cross-origin.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
