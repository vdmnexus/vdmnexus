/**
 * One-shot deployer: push this repo to gitlawb, with a signed-inference
 * announcement baked in as `.gitlawb/receipt.json` + `.gitlawb/announcement.md`.
 *
 *   pnpm --filter nexus gitlawb:deploy           # interactive
 *   pnpm --filter nexus gitlawb:deploy -- --yes  # non-interactive
 *
 * What it does
 *   1. X402Agent.payAndInfer → asks the model to write a short
 *      announcement for the gitlawb push. Costs the agent ~0.01 USDC.
 *   2. verifyReceipt → asserts all five checks pass. Aborts on failure.
 *   3. Ensures the `gl` CLI is installed and a gitlawb DID exists
 *      (runs `gl identity new` if not).
 *   4. `gl repo create <name>` — idempotent: if it already exists, the
 *      CLI reports that and we continue.
 *   5. Writes `.gitlawb/receipt.json` + `.gitlawb/announcement.md` at
 *      repo root and stages them. Confirms with the user before
 *      committing (skip the prompt with --yes).
 *   6. Adds a `gitlawb` git remote and `git push gitlawb main`.
 *   7. Prints the gitlawb URL and a ready-to-post tweet draft.
 *
 * Two distinct keys are at play and that's intentional:
 *   - The Nexus agent's Ed25519 key (DEMO_AGENT_SECRET_KEY) signs the
 *     inference request and pays the x402 USDC fee.
 *   - The gitlawb DID (`gl identity new`) signs the git push.
 *   Both are Ed25519 but managed by different tools. We don't try to
 *   unify them in this script — `gl` owns its keystore.
 *
 * Env
 *   NEXUS_ENDPOINT          Base URL up to (but not including) /api/v1.
 *                           Default: http://localhost:3001
 *   DEMO_AGENT_SECRET_KEY   base58 64-byte secret of a USDC-funded
 *                           devnet agent. Required.
 *   GITLAWB_REPO_NAME       Name of the gitlawb repo. Default: vdmnexus.
 *   GITLAWB_REPO_DESC       Description. Default: VDM Nexus monorepo.
 *   SOLANA_RPC_URL          Optional — speeds up on-chain verify.
 */

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { X402Agent, verifyReceipt } from "../../../packages/x402/dist/index.js";

const ENDPOINT = process.env.NEXUS_ENDPOINT ?? "http://localhost:3001";
const SECRET = process.env.DEMO_AGENT_SECRET_KEY;
const REPO_NAME = process.env.GITLAWB_REPO_NAME ?? "vdmnexus";
const REPO_DESC =
  process.env.GITLAWB_REPO_DESC ??
  "VDM Nexus — infrastructure for autonomous AI agents. Mirror of github.com/vdmnexus/vdmnexus, deployed by a Nexus agent with a verifiable signed-inference receipt.";
const AUTO_YES = process.argv.includes("--yes") || process.argv.includes("-y");

function sh(cmd: string, opts: { capture?: boolean } = {}): string {
  if (opts.capture) {
    return execSync(cmd, { encoding: "utf8" }).trim();
  }
  execSync(cmd, { stdio: "inherit" });
  return "";
}

function has(cmd: string): boolean {
  const r = spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" });
  return r.status === 0;
}

function repoRoot(): string {
  return sh("git rev-parse --show-toplevel", { capture: true });
}

async function confirm(question: string): Promise<boolean> {
  if (AUTO_YES) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(`${question} [y/N] `, (ans) => {
      rl.close();
      res(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

async function main() {
  if (!SECRET) {
    console.error(
      "DEMO_AGENT_SECRET_KEY required (base58 64-byte secret of a USDC-funded devnet agent)."
    );
    process.exit(1);
  }

  const root = repoRoot();
  console.log(`Repo root:    ${root}`);
  console.log(`Endpoint:     ${ENDPOINT}`);
  console.log(`Gitlawb repo: ${REPO_NAME}`);
  console.log();

  // 1. Signed inference for the announcement text.
  const agent = X402Agent.fromBase58(SECRET);
  console.log(`Agent pubkey: ${agent.pubkey}`);
  console.log();

  const messages = [
    {
      role: "user" as const,
      content:
        `Write a 3-sentence announcement for the very first push of the VDM Nexus monorepo to gitlawb (https://gitlawb.com), a decentralized git network for AI agents. ` +
        `Mention that the push itself was performed by a Nexus agent, that the same agent paid for this very announcement via x402 on Solana devnet, ` +
        `and that the cryptographic receipt of this inference call is committed alongside the code as proof. ` +
        `Direct, technical tone. No marketing fluff. No emoji.`,
    },
  ];

  console.log("→ payAndInfer …");
  const t0 = Date.now();
  const res = await agent.payAndInfer(`${ENDPOINT}/api/v1`, {
    model: "openai/gpt-4o-mini",
    messages,
  });
  console.log(`  ✓ ${Date.now() - t0}ms`);
  if (!res.receipt) {
    console.error("No receipt in response — aborting.");
    process.exit(1);
  }
  const announcement = res.openai.choices?.[0]?.message?.content?.trim() ?? "";
  if (!announcement) {
    console.error("Empty model response — aborting.");
    process.exit(1);
  }
  console.log();
  console.log("Announcement:");
  console.log(announcement.split("\n").map((l) => `  ${l}`).join("\n"));
  console.log();

  // 2. Verify locally before committing the receipt.
  console.log("→ verifyReceipt …");
  const v = await verifyReceipt({
    receipt: res.receipt,
    prompt: messages,
    response: res.openai,
    endpoint: ENDPOINT,
    rpc: process.env.SOLANA_RPC_URL,
  });
  for (const [k, val] of Object.entries(v.checks)) {
    console.log(`    ${val ? "✓" : "✗"} ${k}`);
  }
  if (!v.ok) {
    console.error("Receipt verification failed — aborting.");
    process.exit(1);
  }
  console.log();

  // 3. Ensure gl CLI + DID.
  if (!has("gl")) {
    console.log("gl CLI not found.");
    const ok = await confirm(
      "Install gitlawb CLI from https://gitlawb.com/install.sh ?"
    );
    if (!ok) {
      console.error("Aborted by user.");
      process.exit(1);
    }
    sh("curl -fsSL https://gitlawb.com/install.sh | sh");
  }

  let did = "";
  try {
    did = sh("gl identity show", { capture: true });
  } catch {
    console.log("No gitlawb identity found — running `gl identity new`.");
    sh("gl identity new");
    did = sh("gl identity show", { capture: true });
  }
  // `gl identity show` may print "did:key:z6Mk..." possibly with extra text;
  // extract the DID line.
  const didMatch = did.match(/did:key:[A-Za-z0-9]+/);
  if (!didMatch) {
    console.error(`Could not parse DID from \`gl identity show\` output:\n${did}`);
    process.exit(1);
  }
  const didKey = didMatch[0];
  console.log(`Gitlawb DID:  ${didKey}`);
  console.log();

  // 4. Create the repo (idempotent — re-running prints "already exists").
  console.log(`→ gl repo create ${REPO_NAME} …`);
  try {
    sh(`gl repo create ${REPO_NAME} --description ${JSON.stringify(REPO_DESC)}`);
  } catch {
    console.log("  (repo may already exist — continuing)");
  }
  console.log();

  // 5. Write deploy artifacts.
  const artifactDir = `${root}/.gitlawb`;
  if (!existsSync(artifactDir)) mkdirSync(artifactDir, { recursive: true });
  writeFileSync(
    `${artifactDir}/receipt.json`,
    JSON.stringify(res.receipt, null, 2) + "\n"
  );
  writeFileSync(
    `${artifactDir}/announcement.md`,
    `# VDM Nexus on gitlawb\n\n${announcement}\n\n---\n\n` +
      `**Pushed by:** Nexus agent \`${agent.pubkey}\`\n` +
      `**Gitlawb DID:** \`${didKey}\`\n` +
      `**Inference receipt:** [\`.gitlawb/receipt.json\`](./receipt.json)\n` +
      `**Verify:** \`pnpm add @vdm-nexus/x402\` then call ` +
      `\`verifyReceipt({ receipt, prompt, response, endpoint: "${ENDPOINT}" })\`\n` +
      `**Settlement tx:** [explorer](https://explorer.solana.com/tx/${res.receipt.payment.tx_signature}?cluster=devnet)\n`
  );
  console.log("Wrote .gitlawb/receipt.json and .gitlawb/announcement.md");

  const proceed = await confirm(
    `Stage + commit \`.gitlawb/\` and push to remote "gitlawb"?`
  );
  if (!proceed) {
    console.log("Stopped before commit. Artifacts left in .gitlawb/ for review.");
    process.exit(0);
  }

  sh(`git -C ${JSON.stringify(root)} add .gitlawb`);
  // Bail out cleanly if nothing changed (rerun on clean tree).
  const dirty = sh(`git -C ${JSON.stringify(root)} status --porcelain .gitlawb`, {
    capture: true,
  });
  if (dirty) {
    sh(
      `git -C ${JSON.stringify(root)} commit -m ${JSON.stringify(
        "Deploy to gitlawb: signed-inference receipt + announcement"
      )}`
    );
  } else {
    console.log("Artifacts already committed — skipping commit.");
  }

  // 6. Add remote + push. The gitlawb remote URL is owned by
  // git-remote-gitlawb; we ask `gl` for it rather than guessing.
  let remoteUrl = "";
  try {
    remoteUrl = sh(`gl repo clone-url ${REPO_NAME}`, { capture: true });
  } catch {
    remoteUrl = `gitlawb://${didKey}/${REPO_NAME}`;
    console.log(
      `  (gl repo clone-url not available; falling back to ${remoteUrl})`
    );
  }
  try {
    sh(`git -C ${JSON.stringify(root)} remote remove gitlawb`);
  } catch {
    // remote did not exist — fine
  }
  sh(`git -C ${JSON.stringify(root)} remote add gitlawb ${remoteUrl}`);

  const branch = sh(`git -C ${JSON.stringify(root)} rev-parse --abbrev-ref HEAD`, {
    capture: true,
  });
  console.log(`→ git push gitlawb ${branch} …`);
  sh(`git -C ${JSON.stringify(root)} push gitlawb ${branch}`);

  // 7. Done.
  const profile = `https://gitlawb.com/${didKey.replace(/^did:key:/, "")}/${REPO_NAME}`;
  console.log();
  console.log("✓ Deployed.");
  console.log(`  Profile:  ${profile}`);
  console.log(`  Receipt:  ${profile}/blob/${branch}/.gitlawb/receipt.json`);
  console.log();
  console.log("Tweet draft:");
  console.log("─".repeat(60));
  console.log(
    `first repo pushed to @gitlawb by a VDM Nexus agent — no human in the loop.\n\n` +
      `payment, inference, and push all cryptographically signed. the README inside includes the receipt; anyone can verify it with @vdm-nexus/x402.\n\n` +
      `${profile}\n\n` +
      `cc @kevincodex — signed inference meets signed git.`
  );
  console.log("─".repeat(60));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
