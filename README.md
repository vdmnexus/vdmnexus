# VDM Nexus

> Infrastructure for AI agents that pay for their own compute.

No API keys. No human in the loop. Just an Ed25519 keypair that signs every
request and a USDC balance that gets debited as the agent works.

[vdmnexus.com](https://vdmnexus.com) · [Roadmap](https://vdmnexus.com/roadmap)
· [@vdmnexus](https://x.com/vdmnexus) · [Telegram](https://t.me/vdmnexus)

---

## What it is

Most AI agents today are gated by a human's credit card. They depend on API
keys, OAuth tokens, and humans approving every charge. VDM Nexus removes that
gate.

An agent on Nexus:

1. Owns a Solana keypair — the keypair *is* the identity.
2. Signs every inference request with that key.
3. Holds a USDC balance on Solana that gets debited as it consumes compute.
4. Can top itself up by sending USDC to a Nexus deposit address — fully
   autonomous, no human required.

The whole loop is on-chain settled and off-chain executed.

## Quickstart

```bash
npm install @vdm-nexus/sdk
```

```ts
import { Agent } from "@vdm-nexus/sdk";

// Generate a fresh agent (or load an existing one with Agent.fromBase58)
const agent = Agent.generate();
console.log("agent pubkey:", agent.pubkey);

// Make a signed inference request
const reply = await agent.inference("https://nexus.vdmnexus.com/api/v1", {
  prompt: "Summarize the state of autonomous agents in one sentence.",
  task_type: "fast", // or "reasoning" or "general"
});

console.log(reply.result);
console.log("cost:", reply.receipt?.cost_usdc, "USDC");
console.log("balance:", reply.receipt?.balance_remaining, "USDC");
```

Every reply carries an Ed25519-signed receipt (SIR v2) with the upstream
provider, model used, cost, sha256 hashes of the prompt and response, the
on-chain settlement tx, and the inference log id. Verify it end-to-end
with `verifyReceipt` from `@vdm-nexus/x402` or paste it into
[verify.vdmnexus.com](https://verify.vdmnexus.com).

## How auth works

Every request to `/v1/inference` carries:

- `X-Agent-Pubkey: <base58 Ed25519 public key>` (32 bytes)
- `X-Nexus-Signature: <base58 Ed25519 signature>` (64 bytes, over the raw
  request body)

The body is JSON: `{ prompt, task_type, nonce, timestamp }`. The server
verifies the signature against the raw body bytes, rejects requests with a
timestamp more than 30 seconds away from now (replay protection), rejects
reused nonces, and only then debits the agent's balance and runs the
inference.

There are no API keys to rotate, leak, or scope. The public key is the
identity.

## Repo layout

This is a Turbo + pnpm monorepo.

```
apps/
  web/         Marketing site at vdmnexus.com
  nexus/       Agent payment rail + inference API at nexus.vdmnexus.com
  verify/      Hosted receipt verifier at verify.vdmnexus.com
  docs/        Developer docs at docs.vdmnexus.com
packages/
  sdk/         @vdm-nexus/sdk     — Ed25519 agent identity, signed inference
  x402/        @vdm-nexus/x402    — x402 client + verifyReceipt
  paywall/     @vdm-nexus/paywall — Express / Hono / Next.js middleware
  mcp-server/  @vdm-nexus/mcp     — MCP server for Claude Desktop / Cursor
```

All four packages MIT, ESM-only, published on npm.

## Run the demo locally

```bash
pnpm install
pnpm --filter @vdm-nexus/sdk build

# Set apps/nexus/.env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# OPENROUTER_API_KEY. See apps/nexus/.env.example for the full list.

# Terminal 1 — start the agent rail
pnpm --filter nexus dev

# Terminal 2 — run the demo agent
pnpm --filter nexus demo
```

You'll see a fresh agent get generated, three signed inference calls fire,
and the balance drop after each one.

## Status

**Mainnet live** on Solana and Base. The agent rail handles signed
inference, x402 v2 per-call payments, deposits via 2-minute cron, and
issues Ed25519-signed receipts (SIR v2) verifiable end-to-end via
`verifyReceipt` in `@vdm-nexus/x402` or the hosted verifier at
[verify.vdmnexus.com](https://verify.vdmnexus.com).

Built in public — every change shows up on
[vdmnexus.com/roadmap](https://vdmnexus.com/roadmap) within 60 seconds.

## License

MIT — the SDK (`packages/sdk`) and everything in this repo is permissively
licensed. Fork it, build on it, run your own version. We just ask that you
don't trademark VDM Nexus or claim affiliation if you fork.

## Contributing

This is early. The cleanest way to contribute right now:

1. Try the demo. Tell us what broke.
2. File issues with reproduction steps.
3. PRs welcome on the SDK and on `apps/nexus` examples.

Larger architectural changes — chat first via
[Telegram](https://t.me/vdmnexus) or open a discussion before sending a big
PR.

## Acknowledgements

This SDK uses [`tweetnacl`](https://github.com/dchest/tweetnacl-js) and
[`bs58`](https://github.com/cryptocoinjs/bs58) for Ed25519 signing and
base58 encoding. The agent rail proxies to
[OpenRouter](https://openrouter.ai) for multi-provider inference.
