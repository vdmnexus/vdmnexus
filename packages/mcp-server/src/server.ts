import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, type ServerConfig } from "./config.js";
import {
  signedInferenceInput,
  verifyReceiptInput,
  signedInferenceHandler,
  verifyReceiptHandler,
} from "./tools.js";

export const SERVER_NAME = "vdm-nexus-mcp";
export const SERVER_VERSION = "0.1.0";

export function buildServer(config: ServerConfig = loadConfig()): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    "signed_inference",
    {
      title: "Signed inference",
      description:
        "Run an LLM call against VDM Nexus and get back a Signed Inference Receipt (SIR v2). " +
        "Two modes: \"prepaid\" debits an operator-side credit ledger via /v1/inference; " +
        "\"x402\" pays per call with a Solana USDC transfer via /v1/chat/completions. " +
        "Default mode comes from NEXUS_PAYMENT_MODE; per-call `mode` overrides it. " +
        "The result includes the model output plus a tamper-proof receipt the caller can verify with verify_receipt.",
      inputSchema: signedInferenceInput,
    },
    async (args) => signedInferenceHandler(config, args)
  );

  server.registerTool(
    "verify_receipt",
    {
      title: "Verify SIR receipt",
      description:
        "Run the five-check verification on a Signed Inference Receipt: " +
        "prompt hash, response hash, operator Ed25519 signature, and (for x402 receipts) " +
        "on-chain USDC transfer + payer match. Returns { ok, checks }. " +
        "Works without an agent secret — useful for clients that only need to audit receipts.",
      inputSchema: verifyReceiptInput,
    },
    async (args) => verifyReceiptHandler(config, args)
  );

  return server;
}
