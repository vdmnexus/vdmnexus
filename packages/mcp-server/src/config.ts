export type PaymentMode = "prepaid" | "x402";

export type ServerConfig = {
  endpoint: string;
  agentSecretKey: string | null;
  paymentMode: PaymentMode;
  defaultModel: string;
  operatorKey: string | null;
  solanaRpcUrl: string | null;
};

const DEFAULT_ENDPOINT = "https://nexus.vdmnexus.com/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

function readPaymentMode(raw: string | undefined): PaymentMode {
  if (raw === "x402") return "x402";
  if (raw === "prepaid" || raw === undefined || raw === "") return "prepaid";
  throw new Error(
    `NEXUS_PAYMENT_MODE must be "prepaid" or "x402" (got "${raw}")`
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    endpoint: (env.NEXUS_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/$/, ""),
    agentSecretKey: env.NEXUS_AGENT_SECRET_KEY?.trim() || null,
    paymentMode: readPaymentMode(env.NEXUS_PAYMENT_MODE?.trim()),
    defaultModel: env.NEXUS_DEFAULT_MODEL?.trim() || DEFAULT_MODEL,
    operatorKey: env.NEXUS_OPERATOR_KEY?.trim() || null,
    solanaRpcUrl: env.NEXUS_SOLANA_RPC_URL?.trim() || null,
  };
}
