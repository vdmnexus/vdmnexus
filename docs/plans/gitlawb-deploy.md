# Gitlawb deploy plan

Working plan for the first one-shot deploy of the VDM Nexus monorepo to
gitlawb via `pnpm --filter nexus gitlawb:deploy`
(`apps/nexus/scripts/gitlawb-deploy.ts`).

Status: not yet run. This doc tracks what we need to line up before
running it, what to inspect during the run, and what "done" looks like.

## Why this exists

The script makes a single push do four things at once:

1. A Nexus agent calls `/v1/chat/completions` (x402-gated) and pays
   ~0.01 USDC on Solana devnet for a model-written announcement.
2. `verifyReceipt` runs locally and must pass all five checks before
   anything is committed.
3. The signed receipt + the announcement are committed at `.gitlawb/`.
4. A new `gitlawb` git remote is added and `git push gitlawb <branch>`
   ships the repo to gitlawb under our DID.

Two distinct Ed25519 keys are involved by design: the Nexus agent key
(`DEMO_AGENT_SECRET_KEY`) signs + pays for the inference; the gitlawb
DID (`gl identity new`) signs the git push. We do not try to unify
them — `gl` owns its keystore.

## Outcome we want

- Repo `vdmnexus` exists on gitlawb under our DID.
- `.gitlawb/receipt.json` + `.gitlawb/announcement.md` are committed
  and reachable on gitlawb.
- The committed receipt re-verifies 5/5 with `@vdm-nexus/x402` from a
  fresh checkout (anyone can reproduce).
- Tweet draft printed by the script is captured for posting.

## Prereqs

### Local toolchain

- Node 20+, pnpm
- git, curl (curl only needed if `gl` is missing and we let the script
  install it via `curl -fsSL https://gitlawb.com/install.sh | sh`)

### Built packages

`scripts/gitlawb-deploy.ts` imports the compiled verifier:

```ts
import { X402Agent, verifyReceipt } from "../../../packages/x402/dist/index.js";
```

So build the workspace before running:

```bash
pnpm install
pnpm --filter @vdmnexus/sdk build
pnpm --filter @vdm-nexus/x402 build
```

### A reachable nexus

`payAndInfer` POSTs against `${NEXUS_ENDPOINT}/api/v1/chat/completions`.
Default: `http://localhost:3001`. Two options:

- **Prod (recommended for v1):** `NEXUS_ENDPOINT=https://nexus.vdmnexus.com`.
  Lowest moving-parts count; the deploy is on the same endpoint everyone
  else will use to verify the receipt.
- **Local nexus:** `pnpm --filter nexus dev` in another terminal. Needs
  the full `apps/nexus/.env` set up (`OPENROUTER_API_KEY`, facilitator
  config, `NEXUS_OPERATOR_SECRET_KEY`, etc. — see CLAUDE.md).

Either way the target nexus must have:

- a working facilitator (`NEXUS_FACILITATOR_LOCAL=true` with KMS, or
  `X402_FACILITATOR_URL`) — NOT the mock
- `NEXUS_OPERATOR_SECRET_KEY` set (chat-completions fails closed without it)
- `X402_FLAT_PRICE_USDC` (default 0.01) and the deposit address agree
  with what the script will pay

### A USDC-funded devnet agent

- Ed25519 keypair as base58 64-byte secret → `DEMO_AGENT_SECRET_KEY`.
  Generate via `nacl.sign.keyPair()` and base58-encode `secretKey` if
  you don't already have one. (`pnpm --filter nexus demo` will generate
  one on first run if `DEMO_AGENT_SECRET_KEY` is blank — capture it
  from the output.)
- Devnet USDC ≥ `X402_FLAT_PRICE_USDC` on the agent's wallet. Use
  [faucet.circle.com](https://faucet.circle.com) to airdrop USDC; this
  also pre-creates the agent's USDC ATA.
- **The agent does NOT need SOL.** In our consolidated x402 topology
  the facilitator pays the SOL fee; the agent only signs an SPL
  transfer.

### Gitlawb prereqs

- `gl` CLI installed (script offers to install if missing).
- Gitlawb DID (script runs `gl identity new` if no identity).
- Gitlawb network reachable from this machine.

## Run plan

### 1. Sanity-check the target nexus

```bash
curl -s "$NEXUS_ENDPOINT/api/v1/operator-key" | jq
# expect { pubkey, algorithm: "ed25519", encoding: "base58" }

curl -s "$NEXUS_ENDPOINT/api/v1/deposit-address" | jq
# expect { address, mint, network }
```

If either 404s or the facilitator is the mock, stop — the receipt
won't verify on-chain.

### 2. Check the agent's USDC balance

```bash
solana balance --url devnet <agent-pubkey>            # SOL, just to see it's a real wallet
spl-token balance --url devnet --owner <agent-pubkey> <usdc-mint>
```

≥ 0.01 USDC, ATA exists. If the ATA doesn't exist, hit
faucet.circle.com once and confirm.

### 3. First run — interactive, no `--yes`

```bash
cd /home/user/vdmnexus

export NEXUS_ENDPOINT=https://nexus.vdmnexus.com    # or http://localhost:3001
export DEMO_AGENT_SECRET_KEY=<base58 64-byte secret>
export SOLANA_RPC_URL=https://api.devnet.solana.com  # speeds up verify
# optional
export GITLAWB_REPO_NAME=vdmnexus
export GITLAWB_REPO_DESC="VDM Nexus — infrastructure for autonomous AI agents."

pnpm --filter nexus gitlawb:deploy
```

The script will print the agent pubkey, run payAndInfer, run
verifyReceipt, and write `.gitlawb/receipt.json` +
`.gitlawb/announcement.md`. **Then it pauses** and asks:

> Stage + commit `.gitlawb/` and push to remote "gitlawb"? \[y/N\]

While paused, in another terminal:

- `cat .gitlawb/announcement.md` — reads correctly, no model
  hallucinations about features we don't have, no emoji.
- `jq . .gitlawb/receipt.json` — `v: 2`, `nexus_signature` present,
  `payment.tx_signature` present, plausible `cost_usdc`.
- Open `https://explorer.solana.com/tx/<tx_signature>?cluster=devnet`
  in a browser — confirm the USDC transfer landed on the expected
  deposit address.

Only then answer `y`.

### 4. Watch the push

The script does `gl repo create <name>` (idempotent), adds a `gitlawb`
remote (resolved via `gl repo clone-url <name>`, with a
`gitlawb://<did>/<name>` fallback), then `git push gitlawb <branch>`.
If clone-url isn't available, log the fallback URL — useful data for
the gitlawb folks.

### 5. Capture the tweet draft

Script prints a 60-char divider, then a multi-line tweet body. Copy it
verbatim; don't post until step 6 verifies clean.

## Post-deploy verification

1. Visit the printed `Profile:` URL on gitlawb.com — repo, branch,
   files visible.
2. Click through to `.gitlawb/receipt.json` on gitlawb (not GitHub) and
   confirm it matches what's at `HEAD` locally.
3. Re-verify from a fresh shell, simulating an outsider:

   ```bash
   mkdir /tmp/verify && cd /tmp/verify
   pnpm init -y && pnpm add @vdm-nexus/x402
   # paste receipt + prompt + response into a check.mjs
   node check.mjs
   ```

   Expect all five checks ✓: `prompt_hash_ok`, `response_hash_ok`,
   `nexus_signature_ok`, `payment_on_chain_ok`, `payer_matches`.
4. Confirm the settlement tx still resolves on explorer.solana.com.
5. Post the tweet.

## Rollback / blast radius

- The USDC payment is on-chain and is the point — there is no "undo".
  Cost: ~0.01 USDC on devnet (i.e. nothing).
- If the script fails after writing artifacts but before commit:
  `.gitlawb/` is left for inspection. Re-run is safe; the receipt
  file gets overwritten with the next attempt's receipt.
- If the script fails after commit but before push: the local commit
  can be `git reset --soft HEAD~1` and re-run; or just retry `git push
  gitlawb <branch>` once the remote issue is sorted.
- If the gitlawb repo needs to be deleted after the fact: `gl repo
  delete <name>` (verify the exact verb on the CLI version we ship
  with).

## Open questions

- [ ] Does `gl repo clone-url <name>` exist on the current CLI? If
      not, we always hit the `gitlawb://<did>/<name>` fallback.
- [ ] Default visibility on `gl repo create` — public or private? We
      want public for this push.
- [ ] After the first push, do we want
      `.github/workflows/gitlawb-mirror.yml` to keep gitlawb in sync
      on every main push? (Workflow exists; not wired yet.)
- [ ] Mainnet variant: same plan, but `network: "solana:mainnet"` on
      the inference request and a mainnet-funded agent. Real USDC,
      real SOL fees on the facilitator side. Out of scope for this
      first push.

## Done state

- Profile URL on gitlawb resolves and shows the repo.
- `.gitlawb/receipt.json` re-verifies 5/5 from a fresh checkout via
  `@vdm-nexus/x402`.
- Tweet posted.
- This file gets a "Run log" section appended below with the actual
  agent pubkey, tx signature, gitlawb DID, and timestamp from the
  successful run.

## Run log

_(empty — fill in after the first real run.)_
