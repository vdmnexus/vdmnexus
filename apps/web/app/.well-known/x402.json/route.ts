/**
 * x402 discovery manifest. Served at /.well-known/x402.json with a
 * no-extension alias at /.well-known/x402 (see ../x402/route.ts).
 *
 * Consumed by x402 indexers (Coinbase Bazaar, Agentic.Market,
 * awesome-x402 reviewers, agent crawlers) to discover the paid endpoint
 * catalogue, supported networks, pricing, and receipt format from the
 * canonical product domain without scraping the marketing site.
 *
 * The shape here follows the de-facto pattern emerging in 2026 — single
 * top-level object with `endpoints[]`, each entry self-describing its
 * route, method, pricing, and networks. Extensions to the pattern
 * (`receipt_format`, `verifier`) are documented inline so an indexer
 * that doesn't recognise them can still parse the core fields.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BASE_USDC_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Default receipt fee — kept in sync with NEXUS_RECEIPT_FEE_USDC on the
// nexus app. If the runtime fee changes, update both.
const RECEIPT_FEE_USDC = "0.01";

type Manifest = {
  version: string;
  x402_version: string;
  service: {
    name: string;
    description: string;
    homepage: string;
    documentation: string;
    source: string;
  };
  endpoints: Array<{
    url: string;
    method: string;
    description: string;
    auth: string;
    pricing: {
      receipt_fee_usdc: string;
      inference_cost_model: string;
      networks: Array<{
        chain: string;
        asset: string;
        asset_name: string;
      }>;
    };
  }>;
  facilitator: {
    type: string;
    signing: string;
    notes: string;
  };
  receipt_format: {
    name: string;
    version: string;
    spec: string;
    verifier_endpoint: string;
    operator_key_endpoint: string;
  };
  agent_discovery: {
    public_directory: string;
    per_agent_profile_template: string;
    agent_card_well_known: string[];
  };
};

function buildManifest(): Manifest {
  return {
    version: "1.0",
    x402_version: "v2",
    service: {
      name: "VDM Nexus",
      description:
        "Signed-inference rail for autonomous AI agents. OpenAI-compatible /chat/completions gated by x402; every paid call returns an Ed25519-signed SIR v2 receipt covering prompt hash, response hash, model, cost, and on-chain settlement.",
      homepage: "https://vdmnexus.com",
      documentation: "https://docs.vdmnexus.com",
      source: "https://github.com/vdmnexus/vdmnexus",
    },
    endpoints: [
      {
        url: "https://nexus.vdmnexus.com/api/v1/chat/completions",
        method: "POST",
        description:
          "OpenAI-compatible chat completion. Unpaid POST returns 402 with X-Payment-Required; paid retry includes X-Payment header and gets the response + X-Nexus-Receipt (SIR v2) + X-Payment-Response.",
        auth: "x402-v2 — payer wallet is the agent identity, no separate auth headers",
        pricing: {
          receipt_fee_usdc: RECEIPT_FEE_USDC,
          inference_cost_model:
            "Pass-through from upstream usage.cost (OpenRouter), no protocol markup",
          networks: [
            {
              chain: "solana:mainnet",
              asset: SOLANA_USDC_MINT,
              asset_name: "USDC",
            },
            {
              chain: "solana:devnet",
              asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
              asset_name: "USDC (devnet)",
            },
            {
              chain: "eip155:8453",
              asset: BASE_USDC_ASSET,
              asset_name: "USDC",
            },
            {
              chain: "eip155:84532",
              asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              asset_name: "USDC (Base Sepolia)",
            },
          ],
        },
      },
      {
        url: "https://nexus.vdmnexus.com/api/v1/inference",
        method: "POST",
        description:
          "Signed-inference endpoint with off-chain credits ledger. Agents pre-fund via USDC deposit; calls debit from balance. Auth: X-Agent-Pubkey + X-Nexus-Signature (Ed25519 over raw body).",
        auth: "Ed25519 signed request — X-Agent-Pubkey + X-Nexus-Signature",
        pricing: {
          receipt_fee_usdc: RECEIPT_FEE_USDC,
          inference_cost_model:
            "Pass-through from upstream usage.cost, debited from credits balance",
          networks: [
            {
              chain: "solana:mainnet",
              asset: SOLANA_USDC_MINT,
              asset_name: "USDC",
            },
          ],
        },
      },
    ],
    facilitator: {
      type: "self-hosted-svm",
      signing: "aws-kms-ed25519",
      notes:
        "Self-hosted x402 facilitator with AWS KMS-backed Ed25519 signing. Key never enters lambda memory. CDP facilitator opt-in available per-request via ?via=cdp query param for x402 Bazaar / Agentic.Market indexing.",
    },
    receipt_format: {
      name: "SIR v2",
      version: "2",
      spec: "https://docs.vdmnexus.com/docs/spec/sir-v2",
      verifier_endpoint: "https://verify.vdmnexus.com",
      operator_key_endpoint:
        "https://nexus.vdmnexus.com/api/v1/operator-key",
    },
    agent_discovery: {
      public_directory: "https://vdmnexus.com/agents",
      per_agent_profile_template:
        "https://console.vdmnexus.com/a/<base58-ed25519-pubkey>",
      agent_card_well_known: [
        "https://vdmnexus.com/.well-known/agent.json",
        "https://vdmnexus.com/.well-known/agent-card.json",
        "https://vdmnexus.com/.well-known/agent-registration.json",
      ],
    },
  };
}

export async function GET(): Promise<NextResponse> {
  const manifest = buildManifest();
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
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
