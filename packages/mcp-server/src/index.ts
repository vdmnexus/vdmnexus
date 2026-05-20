#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { loadConfig } from "./config.js";

export { buildServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
export { loadConfig } from "./config.js";
export type { ServerConfig, PaymentMode } from "./config.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = buildServer(config);

  // Stdout is the MCP wire — anything we want to surface must go to stderr.
  if (!config.agentSecretKey) {
    process.stderr.write(
      "[vdm-nexus-mcp] NEXUS_AGENT_SECRET_KEY is not set. " +
        "verify_receipt works, but signed_inference will fail until you set it.\n"
    );
  }
  process.stderr.write(
    `[vdm-nexus-mcp] ${SERVER_NAME} v${SERVER_VERSION} on stdio — endpoint=${config.endpoint} mode=${config.paymentMode}\n`
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// ESM-safe "run if executed directly" check.
const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("dist/index.js") === true;

if (invokedDirectly) {
  main().catch((err: unknown) => {
    process.stderr.write(
      `[vdm-nexus-mcp] fatal: ${(err as Error).stack ?? String(err)}\n`
    );
    process.exit(1);
  });
}
