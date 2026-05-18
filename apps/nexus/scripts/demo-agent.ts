// Demo: spawn an agent, seed its credit balance directly in Supabase,
// run three signed inference calls, print the dropping balance.
//
// Run:  pnpm --filter nexus demo
//
// Required env in apps/nexus/.env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY),
//   OPENROUTER_API_KEY
// Optional:
//   NEXUS_ENDPOINT (default http://localhost:3001/api/v1)
//   DEMO_AGENT_SECRET_KEY (base58 64-byte secret; generated if blank)
//   DEMO_SEED_USDC (default 1.00)

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

import { Agent, type TaskType } from "../../../packages/sdk/dist/index.js";
import { createClient } from "@supabase/supabase-js";

const ENDPOINT = process.env.NEXUS_ENDPOINT ?? "http://localhost:3001/api/v1";
const SEED_USDC = Number(process.env.DEMO_SEED_USDC ?? "1.00");

const PROMPTS: Array<{ task_type: TaskType; prompt: string }> = [
  { task_type: "fast", prompt: "Summarize the state of AI agents in 2026" },
  {
    task_type: "reasoning",
    prompt: "What is the moat of a compute infrastructure protocol?",
  },
  {
    task_type: "reasoning",
    prompt: "Write a one-line pitch for autonomous compute payments",
  },
];

const BAR = "━".repeat(40);

function shortKey(pubkey: string): string {
  if (pubkey.length <= 8) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

function money(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)."
    );
    process.exit(1);
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const secret = process.env.DEMO_AGENT_SECRET_KEY;
  const agent = secret ? Agent.fromBase58(secret) : Agent.generate();

  await supabase
    .from("agents")
    .upsert(
      { pubkey: agent.pubkey, label: "demo-agent" },
      { onConflict: "pubkey" }
    );
  await supabase.from("credits_ledger").insert({
    agent_pubkey: agent.pubkey,
    delta_usdc: SEED_USDC,
    reason: "demo_seed",
  });

  console.log("VDM Nexus — Agent Demo");
  console.log(BAR);
  console.log(`Agent keypair:   ${shortKey(agent.pubkey)}`);
  console.log(`Opening balance: ${money(SEED_USDC)} USDC`);
  console.log();

  let totalSpent = 0;
  let successCount = 0;

  for (let i = 0; i < PROMPTS.length; i++) {
    const step = PROMPTS[i]!;
    console.log(`[${i + 1}/${PROMPTS.length}] Prompt: "${step.prompt}"`);

    const reply = await agent.inference(ENDPOINT, {
      prompt: step.prompt,
      task_type: step.task_type,
    });

    if (!reply.ok || !reply.receipt) {
      console.log(
        `  ✗ ${reply.error}${reply.detail ? ` (${reply.detail})` : ""}`
      );
      console.log();
      break;
    }

    const r = reply.receipt;
    console.log(`  Provider: ${r.provider} / ${r.model}`);
    console.log(`  Cost:     ${money(r.cost_usdc)}`);
    console.log(`  Balance:  ${money(r.balance_remaining)}`);
    console.log(`  ✓`);
    console.log();

    totalSpent += r.cost_usdc;
    successCount++;
  }

  console.log("Demo complete.");
  console.log(`Total spent:      ${money(totalSpent)} USDC`);
  console.log(`Inference calls:  ${successCount}`);
  console.log(`Agent identity:   ${shortKey(agent.pubkey)}`);
  console.log(`Ledger:           append-only, auditable, on Supabase`);
  console.log();
  console.log(
    "This agent paid for its own compute. No API keys. No humans. No middlemen."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
