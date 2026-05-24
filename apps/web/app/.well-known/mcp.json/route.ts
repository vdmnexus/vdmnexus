/**
 * MCP discovery pointer. Returned at /.well-known/mcp.json so any
 * MCP-aware crawler or client config tool can discover that the Nexus
 * domain ships an MCP server (via the published npm package
 * @vdm-nexus/mcp), what tools it exposes, and how to wire it into
 * Claude Desktop / Cursor / any MCP-aware client.
 *
 * The MCP discovery convention is less standardised than x402 or
 * EIP-8004; the shape here follows the pattern emerging in 2026 — a
 * top-level package pointer + tool catalogue + example config.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type McpManifest = {
  version: string;
  mcp_version: string;
  server: {
    name: string;
    description: string;
    transport: string[];
    package: {
      type: string;
      name: string;
      version: string;
      url: string;
    };
    source: string;
    documentation: string;
  };
  tools: Array<{
    name: string;
    description: string;
  }>;
  client_config: {
    command: string;
    args: string[];
    env: Record<string, string>;
  };
  notes: string;
};

function buildManifest(): McpManifest {
  return {
    version: "1.0",
    mcp_version: "2024-11-05",
    server: {
      name: "VDM Nexus MCP",
      description:
        "Exposes the VDM Nexus signed-inference rail as a tool surface for any MCP-aware client. The server holds the agent secret key and handles the x402 v2 payment handshake transparently — calling tools triggers a paid signed-inference call and returns the model response + the SIR v2 receipt.",
      transport: ["stdio"],
      package: {
        type: "npm",
        name: "@vdm-nexus/mcp",
        version: "0.1.0",
        url: "https://www.npmjs.com/package/@vdm-nexus/mcp",
      },
      source:
        "https://github.com/vdmnexus/vdmnexus/tree/main/packages/mcp-server",
      documentation: "https://docs.vdmnexus.com/docs/mcp",
    },
    tools: [
      {
        name: "nexus_chat",
        description:
          "Pay-per-call OpenAI-compatible chat completion via x402. Returns the model response plus a SIR v2 signed receipt accessible from the response metadata.",
      },
      {
        name: "nexus_verify_receipt",
        description:
          "Verify a SIR v2 receipt locally via the five-check protocol (prompt hash, response hash, operator signature, on-chain settlement, payer match). No network call to the operator required for steps 1-3.",
      },
      {
        name: "nexus_deposit_address",
        description:
          "Get the Nexus-side deposit address for funding an agent's credit balance with USDC.",
      },
    ],
    client_config: {
      command: "npx",
      args: ["-y", "@vdm-nexus/mcp"],
      env: {
        AGENT_SECRET_KEY: "<base58-encoded Ed25519 secret key>",
      },
    },
    notes:
      "Drop this object into your Claude Desktop / Cursor / Claude Code MCP config and your agent immediately gets pay-per-call signed inference with verifiable receipts. Zero code change. Source MIT.",
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
