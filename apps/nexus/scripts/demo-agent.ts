// Demo: spawn an agent, seed its credit balance directly in Supabase,
// run a few inferences, watch the balance fall.
//
// Run:  pnpm --filter nexus demo
//
// Required env (apps/nexus/.env):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
// Optional:
//   NEXUS_ENDPOINT (default http://localhost:3001/api/v1)
//   DEMO_AGENT_SECRET_KEY (base58 64-byte secret; generated if blank)
//   DEMO_SEED_USDC (default 1.00)

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

import { Agent } from "@vdmnexus/sdk";
import { createClient } from "@supabase/supabase-js";

const ENDPOINT = process.env.NEXUS_ENDPOINT ?? "http://localhost:3001/api/v1";
const SEED_USDC = Number(process.env.DEMO_SEED_USDC ?? "1.00");
const PROMPTS = [
  "In one sentence, what is autonomous compute settlement?",
  "Name three reasons an agent might prefer Solana over Ethereum.",
  "Write a haiku about Ed25519.",
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const secret = process.env.DEMO_AGENT_SECRET_KEY;
  const agent = secret ? Agent.fromBase58(secret) : Agent.generate();

  console.log(`agent pubkey:  ${agent.pubkey}`);
  if (!secret) {
    console.log(`agent secret:  ${agent.secretKeyBase58}`);
    console.log("(save the secret to DEMO_AGENT_SECRET_KEY to reuse this agent)");
  }
  console.log(`endpoint:      ${ENDPOINT}`);
  console.log();

  await supabase
    .from("agents")
    .upsert({ pubkey: agent.pubkey, label: "demo-agent" }, { onConflict: "pubkey" });

  await supabase.from("credits_ledger").insert({
    agent_pubkey: agent.pubkey,
    delta_usdc: SEED_USDC,
    reason: "demo_seed",
  });

  console.log(`seeded ${SEED_USDC.toFixed(6)} USDC`);
  console.log();

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i]!;
    console.log(`[${i + 1}/${PROMPTS.length}] ${prompt}`);
    const t0 = Date.now();
    const reply = await agent.inference(ENDPOINT, { prompt });
    const elapsed = Date.now() - t0;

    if (!reply.ok) {
      console.error(`  FAILED  ${reply.error}${reply.detail ? ` (${reply.detail})` : ""}`);
      break;
    }

    console.log(`  -> ${reply.text?.replace(/\s+/g, " ").slice(0, 140)}`);
    console.log(
      `  model=${reply.model} cost=$${reply.usage?.cost_usdc.toFixed(6)} ` +
        `latency=${reply.usage?.latency_ms}ms (wall ${elapsed}ms) ` +
        `balance=$${reply.balance_usdc?.toFixed(6)}`
    );
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
