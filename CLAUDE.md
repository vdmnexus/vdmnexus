# VDM Nexus

> Infrastructure for autonomous AI agents.

## What this repo is

A Turbo + pnpm monorepo. Four published npm packages, four deployed apps.

```
apps/
  web/         ← Marketing site at vdmnexus.com (live)
  nexus/       ← Agent payment rail + inference API at nexus.vdmnexus.com (live, mainnet)
  verify/      ← Hosted verifier SaaS at verify.vdmnexus.com (live)
  docs/        ← Developer docs at docs.vdmnexus.com (live, 22 pages)
packages/
  sdk/                ← @vdm-nexus/sdk — Ed25519 agent identity, signed inference
  sdk-python/         ← vdm-nexus (PyPI) — Python equivalent of @vdm-nexus/sdk
  x402/               ← @vdm-nexus/x402 — x402 client + verifyReceipt
  paywall/            ← @vdm-nexus/paywall — Express/Hono/Next.js middleware
  mcp-server/         ← @vdm-nexus/mcp — MCP server for Claude Desktop / Cursor
  ai-sdk-provider/    ← @vdm-nexus/ai-sdk-provider — Vercel AI SDK drop-in
  mastra-provider/    ← @vdm-nexus/mastra-provider — Mastra drop-in
```

All six TypeScript packages MIT, ESM-only, published on npm. The Python
SDK ships on PyPI as `vdm-nexus`.

## Strategic stance

The wedge is **signed inference**: inference call + on-chain payment +
cryptographic receipt the caller can verify. We're not OpenRouter (a
multi-provider router) and we're not Akash/0G (a decentralized compute
substrate). We're the trust layer — an inference endpoint that pairs every
LLM call with a verifiable receipt of what the model returned, gated by
x402 on Solana and Base.

The codebase builds the agent payment rail first and proxies the inference
side to OpenRouter for now. Real routing intelligence is a later session,
after the rail is shipping value. The pitch to the rest of the agent
ecosystem is: keep your marketplace, keep your model, use our receipt.

**Vocabulary (locked in 2026-05-19):** use *signed inference* as the noun
for the product everywhere — package READMEs, marketing copy, tweets. It's
descriptive, brandable, two-words memorable, and verb-able. Avoid
"verifiable inference" (already taken by Inference Labs / ZKML projects)
and "proof of inference" (crypto-jargon-heavy).

## Products

### Nexus Compute

What the site says: smart compute routing for AI businesses.
What's actually built: a thin OpenRouter passthrough, gated by Solana-signed
auth, with usage charged against an off-chain credit ledger.

### Nexus Agents

What the site says: infrastructure for autonomous on-chain agents.
What's actually built: agents authenticate with an Ed25519 keypair, sign
every request, and pay per-call via x402 on Solana mainnet or Base. The
deposit loop is closed — agents can top up by sending USDC to a Nexus
deposit address; a 2-minute cron credits the ledger keyed by sender.
Self-top-up from inside an agent process (`Agent.deposit()`) is still
deferred — see "NOT built" below.

## Apps

### `apps/web` — marketing site

Next.js 15 App Router, React 19, Tailwind 3, Framer Motion, Supabase, Inter
via `next/font/google`. Mobile baseline 375px, all animations respect
`prefers-reduced-motion`.

**Public routes:** `/`, `/compute`, `/agents`, `/roadmap`,
`/playground` (live signed-inference console, no account needed),
`/points` (per-agent leaderboard), `/r/[id]` (receipt permalinks with
OG/Twitter card images for sharing).
**Admin routes:** `/admin/login`, `/admin/roadmap` (password-gated).
**API routes:** `/api/waitlist`, `/api/roadmap`, `/api/buildlog`,
`/api/roadmap/items[/:id[/move]]`, `/api/buildlog/:id`,
`/api/admin/{login,logout}`, `/api/receipts/[id]` (receipt fetch for `/r/[id]`),
`/api/points` (leaderboard query).

**Waitlist flow.** Form posts to `/api/waitlist` (Next.js route, Node
runtime). The route uses the Supabase service role to insert into
`public.waitlist`, enforces a per-IP rate limit via `public.waitlist_rate_limit`,
silently accepts honeypot submissions, captures UTM + referrer + hashed IP +
user-agent. Resend (confirmation) and Slack (internal notification) fire
fire-and-forget when their env vars are present.

**Roadmap page** (`/roadmap`) — built-in-public view of phases + a live build
log. Server-rendered phase cards on the left (60% width), client-side build
log on the right (40%, sticky on desktop) that polls `/api/buildlog` every
60s. `active` phase gets an indigo border + glow; `upcoming` phases render
at 60% opacity. Items show three states: `done` (filled indigo check),
`in_progress` (pulsing indigo dot via `animate-soft-pulse`), `planned`
(empty gray circle).

**Admin** (`/admin/roadmap`) — single-user editor protected by a cookie set
via `ADMIN_PASSWORD`. Cycles item status, adds/deletes items, reorders via
up/down (atomic swap of `order_index`), creates/deletes build log entries
(280-char cap). All write endpoints accept either the cookie or an
`X-Admin-Secret` header for tooling.

**Design tokens:**

```
bg:      #080810
surface: #0e0e18
border:  #1e1e2e
text:    #f1f5f9 default, #94a3b8 muted
accent:  #6366f1 indigo, #3b82f6 blue
```

### `apps/nexus` — agent payment rail + inference API

Next.js 15 App Router, API-only, port 3001 in dev.

**Endpoints**

- `GET  /api/health` — liveness
- `POST /api/v1/inference` — the signed-request inference endpoint
- `POST /api/v1/chat/completions` — **x402 v2-gated, OpenAI-shape**.
  Uses canonical types from `@x402/core`. Unpaid POST returns `402 +
  X-Payment-Required` carrying a base64-encoded `PaymentRequired` body
  whose `accepts` array contains one entry per supported network — currently
  `solana:mainnet`, `solana:devnet`, `eip155:8453` (Base mainnet), and
  `eip155:84532` (Base Sepolia). The client picks one and sends the paid
  retry with an `X-Payment` header (base64 JSON `PaymentPayload` containing
  the signed SPL transfer for Solana, or signed ERC-3009 `transferWithAuthorization`
  for Base). Successful response is an OpenAI `chat.completion` body plus
  `X-Nexus-Receipt` and `X-Payment-Response` headers. The payer wallet IS
  the agent identity — no separate auth headers. The active network defaults
  to `solana:mainnet`; per-request override via `X-Nexus-Network` header.
- `GET  /api/v1/deposit-address` — returns `{ address, mint, network }` so
  agents can discover where to send USDC
- `POST /api/v1/deposits/scan` — cron-triggered scanner; requires
  `CRON_SECRET` (Vercel Cron passes it via `Authorization: Bearer ...`,
  the `X-Cron-Secret` header is also accepted for manual triggers)
- `GET  /api/v1/operator-key` — returns the Nexus operator Ed25519
  public key (base58) used to sign receipts: `{ pubkey, algorithm:
  "ed25519", encoding: "base58" }`. Verifiers fetch this to check
  `receipt.nexus_signature`.

**Auth scheme.** Every request to `/v1/inference` carries:

- `X-Agent-Pubkey: <base58 Ed25519 public key>` (32 bytes)
- `X-Nexus-Signature: <base58 Ed25519 signature>` (64 bytes, over the raw
  body bytes — i.e. the exact string the client `JSON.stringify`d)

The body is JSON:
`{ prompt, task_type, nonce, timestamp, max_cost_usdc? }`. `task_type` is one
of `fast | reasoning | general`; `timestamp` is unix ms. The server:

1. Verifies the signature with `tweetnacl` against the raw body bytes.
2. Rejects when `|now - timestamp|` exceeds 30 seconds (replay protection).
3. Auto-registers the agent in `public.agents` if first seen, then inserts
   `(agent_pubkey, nonce)` into `public.nonces` — duplicate insert (23505)
   returns `409 nonce_replay`.
4. Checks `balance_usdc >= 0.001` via the `agent_balances` view (402 if not).
5. Routes the request: `fast` or `max_cost_usdc < 0.001` → Groq Llama 3 70B;
   `reasoning` → Anthropic Claude Haiku; otherwise → OpenAI GPT-4o-mini.
   Routing returns both the user-facing labels for the receipt and the
   actual OpenRouter model slug used upstream.
6. Calls OpenRouter with `usage.include = true`, debits the returned
   `usage.cost`, writes an `inference_logs` row, captures its id.
7. Returns `{ ok, result, receipt }` where `receipt` is a `v: 2`
   object: `{ v, agent_pubkey, provider, model, cost_usdc,
   balance_remaining, prompt_hash, response_hash, timestamp,
   inference_id, nexus_signature }`. Hashes are sha256 of the prompt
   and response text. `nexus_signature` is a base58 Ed25519 signature
   by the operator key over the canonical JSON of the receipt with
   `nexus_signature` excluded (sorted keys, no whitespace). Signing is
   shared with `/chat/completions` via `apps/nexus/lib/receipts.ts`.

**Pricing source of truth.** OpenRouter's returned `usage.cost` (USD). We
pass it through 1:1 to the ledger — no markup at the protocol layer yet.

**Deposit detection.** `apps/nexus/lib/deposits.ts` polls Solana RPC for
recent signatures against `NEXUS_DEPOSIT_ADDRESS`, parses each transaction's
`pre/postTokenBalances` for USDC mint deltas owned by the deposit address,
identifies the agent as the transaction's first signer, and credits the
ledger keyed by sender pubkey with the `tx_signature` set. The unique index
`credits_ledger_tx_idx` makes credits idempotent — a repeated scan of the
same tx never double-credits. Vercel Cron hits `POST /api/v1/deposits/scan`
every 2 minutes (`apps/nexus/vercel.json`).

### `packages/sdk` — `@vdm-nexus/sdk`

MIT, TypeScript, ESM-only. Two runtime deps: `tweetnacl` and `bs58`. Builds
with `tsc` to `dist/`. Published on npm.

```ts
import { Agent } from "@vdm-nexus/sdk";

const agent = Agent.generate();
const reply = await agent.inference("https://nexus.vdmnexus.com/api/v1", {
  prompt: "...",
  model: "openai/gpt-4o-mini",
});
```

The class owns the keypair and handles signing. It does NOT depend on
`@solana/web3.js`. Wallet operations (deposits, transfers) live in the
separate `@vdm-nexus/wallet` package (deferred — see "NOT built") so the
core SDK stays at two runtime deps.

### `packages/x402` — `@vdm-nexus/x402`

MIT, TypeScript, ESM-only. x402 client + receipt verifier. Runtime deps:
`@solana/kit`, `@x402/core`, `@x402/svm`, `bs58`, `tweetnacl`, plus
`@vdm-nexus/sdk` as a workspace dep.

```ts
import { X402Agent, verifyReceipt } from "@vdm-nexus/x402";

const agent = X402Agent.fromBase58(process.env.AGENT_SECRET);
const res = await agent.payAndInfer("https://nexus.vdmnexus.com/api/v1", {
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "hello" }],
});

const v = await verifyReceipt({
  receipt: res.receipt,
  prompt: messages,
  response: res.openai,
  endpoint: "https://nexus.vdmnexus.com",
});
// v.ok === true when all five checks pass
```

`X402Agent.payAndInfer` does the unpaid POST → 402 → sign SPL → paid
POST handshake against `/chat/completions`. `verifyReceipt` runs the
five-check verification described in the Built section above.

### `packages/paywall` — `@vdm-nexus/paywall`

MIT, ESM-only. Drop-in x402 paywall middleware for Express, Hono, and
Next.js route handlers. Every paid call returns a signed Ed25519 receipt
of whatever the wrapped handler produced — turning any HTTP endpoint into
a Nexus-style verifiable resource without rebuilding the receipt machinery.

```ts
import { paywall } from "@vdm-nexus/paywall/express";

app.post("/api/summarize", paywall({
  price: "0.01",                 // USDC
  network: "solana:mainnet",
  payTo: process.env.NEXUS_PAY_TO!,
  operatorSecretKey: process.env.OPERATOR_SK!,
}), async (req, res) => {
  const summary = await summarize(req.body.text);
  res.json({ summary });         // middleware signs the response, attaches X-Nexus-Receipt
});
```

Sub-exports: `@vdm-nexus/paywall/express`, `/hono`, `/next`.

### `packages/mcp-server` — `@vdm-nexus/mcp`

MIT, ESM-only. MCP server that exposes Nexus as a tool surface inside
Claude Desktop, Cursor, and any other MCP-aware host. Ships
`nexus_chat`, `nexus_verify_receipt`, and `nexus_deposit_address` tools.
Configured via `.mcp.json`; the server holds the agent secret key and
handles the 402 handshake transparently.

```jsonc
{
  "mcpServers": {
    "nexus": {
      "command": "npx",
      "args": ["-y", "@vdm-nexus/mcp"],
      "env": { "AGENT_SECRET_KEY": "..." }
    }
  }
}
```

### `apps/verify` — `verify.vdmnexus.com`

Hosted verifier SaaS. Paste a receipt JSON (or a `/r/[id]` permalink),
get back the five-check verification result rendered as a card —
hashes match, operator signature valid, on-chain tx landed at the
correct recipient, payer matches `agent_pubkey`. Embeddable iframe
widget for third parties that don't want to import the SDK.

### `apps/docs` — `docs.vdmnexus.com`

22-page developer documentation site. Sections: SDK, x402, paywall,
MCP, agent-git (placeholder), SIR v2 spec, ops, recipes. Built with
Next.js 15 + MDX. Source of truth for the protocol — any breaking
change to receipt shape ships with a docs PR in the same commit.

## Supabase

One project: `vdmnexus-web` (ref `wuxorxtniyfwjaqurwoe`, EU-West-3).

**Marketing site tables:**

- `waitlist` — emails + UTM/referrer + hashed IP + user agent
- `waitlist_rate_limit` — per-IP-hash count + sliding window
- `roadmap_phases` — public phases (`active|upcoming|completed`)
- `roadmap_items` — items per phase (`done|in_progress|planned`); public read
  via RLS policy, writes via service role only
- `build_log` — append-only commit-log-style entries shown on `/roadmap`

**Agent rail tables:**

- `agents (pubkey PK, label, status, created_at)`
- `credits_ledger` — append-only deltas, `delta_usdc` is positive for credits
  (topups) and negative for debits (inference). Unique index on
  `(tx_signature) where tx_signature is not null` keeps deposit detection
  idempotent.
- `agent_balances` view — `sum(delta_usdc)` per agent
- `nonces (id, agent_pubkey FK, nonce, created_at)` — replay protection,
  unique on `(agent_pubkey, nonce)`. The inference route inserts before
  doing any work and treats a duplicate as `409 nonce_replay`.
- `inference_logs` — every call, including failures, with token counts and
  latency. The successful row's id is returned in the receipt as
  `inference_id`.

All tables have RLS enabled. The agent rail tables have **no policies** —
only the service role touches them, server-side from `apps/nexus`.

## Environment variables

Full schemas with inline comments live in `apps/web/.env.example` and `apps/nexus/.env.example`. Sketch below.

**`apps/web`** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SALT`, `ADMIN_PASSWORD` (gates `/admin/*` + admin write endpoints). Optional: `RESEND_API_KEY`, `RESEND_FROM`, `SLACK_WEBHOOK_URL`.

**`apps/nexus`** — grouped:

- *Core:* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `CRON_SECRET`.
- *Solana:* `SOLANA_NETWORK` (`mainnet-beta` in prod), `SOLANA_RPC_URL`, `NEXUS_DEPOSIT_ADDRESS`, `NEXUS_MAINNET_DEPOSIT_ADDRESS` (override for mainnet), `NEXUS_DEPOSIT_SECRET_KEY` (dev fallback when `NEXUS_KMS_KEY_ID` unset), `NEXUS_USDC_MINT`, `NEXUS_DEPOSIT_SCAN_LIMIT`, `NEXUS_REQUEST_MAX_AGE_SECONDS`, `NEXUS_NETWORK` (default network for `/chat/completions`).
- *EVM (Base):* `NEXUS_EVM_NETWORK`, `NEXUS_EVM_RPC_URL`, `NEXUS_EVM_PRIVATE_KEY` (fee payer for ERC-3009 settlement).
- *Mainnet controls:* `NEXUS_MAINNET_ENABLED` (set to `"false"` → all mainnet paid routes 503 with `mainnet.disabled` log), `NEXUS_ALLOWED_AGENTS` (comma-separated payer pubkeys; route 403s non-listed), `NEXUS_MAX_PRICE_USDC` (hard cap on `X402_FLAT_PRICE_USDC` — challenge issuer fails closed if exceeded).
- *x402 challenge:* `X402_FLAT_PRICE_USDC` (default `0.01`), `X402_NETWORK` (CAIP-2), `X402_RECIPIENT_ADDRESS`. **Pick exactly one facilitator** or the endpoint fails-closed: `NEXUS_FACILITATOR_LOCAL=true` (self-hosted, preferred) | `X402_FACILITATOR_URL` + `X402_FACILITATOR_API_KEY` (remote) | `NEXUS_ALLOW_MOCK_FACILITATOR=true` (dev).
- *CDP facilitator* (opt-in per-request via `?via=cdp` → indexes settlements in x402 Bazaar / Agentic.Market): `CDP_FACILITATOR_URL`. Auth — pick one: JWT mode with `CDP_FACILITATOR_KEY_NAME` + `CDP_FACILITATOR_PRIVATE_KEY` (PKCS#8 PEM; `\n` escapes accepted), or legacy bearer `CDP_FACILITATOR_API_KEY`.
- *KMS signing (prod):* `NEXUS_KMS_KEY_ID` (Ed25519 ARN, `ECC_NIST_EDWARDS25519`), `NEXUS_KMS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. IAM needs `kms:Sign + kms:GetPublicKey + kms:DescribeKey`. Asserts KMS-derived pubkey == `NEXUS_DEPOSIT_ADDRESS` or fails closed.
- *Receipt signing (required):* `NEXUS_OPERATOR_SECRET_KEY` (base58 64-byte tweetnacl secretKey). Pubkey exposed at `GET /api/v1/operator-key`.
- *Rate limiting:* `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or Vercel Marketplace's `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Missing both → limiter fails open with one-shot warn log.
- *Demo script:* `NEXUS_ENDPOINT`, `DEMO_AGENT_SECRET_KEY`, `DEMO_SEED_USDC`.

## Built vs. not built

### Built

**Agent rail.**
- Ed25519 agent identity (Solana-compatible). Signed-request auth, 30-sec timestamp window, nonce replay protection.
- Off-chain credits ledger (append-only deltas, balance view).
- OpenRouter passthrough, cost passed 1:1 from upstream `usage`.
- On-chain deposit detection — 2-min Vercel Cron polls Solana RPC, parses USDC transfers, credits the ledger by sender. Idempotent via unique `tx_signature` index.
- x402 v2-gated `/chat/completions` (OpenAI-shape, self-hosted facilitator preferred). Unpaid POST → 402 with `X-Payment-Required`; paid retry's `X-Payment` is verified, co-signed, broadcast; ledger credited with returned `tx_signature` (idempotent). Fails closed if no facilitator configured.
- Ed25519-signed receipts (`v: 2`). `nexus_signature` is base58 over canonical JSON (sorted keys, no whitespace, signature field excluded). Shared canonicalize+sign in `apps/nexus/lib/receipts.ts`. Operator pubkey at `GET /api/v1/operator-key`.
- AWS KMS-backed facilitator signing — `KMS.Sign` (`ED25519_SHA_512`); key never enters lambda memory. Code in `apps/nexus/lib/kms-signer.ts`.
- Structured JSON logging + Upstash sliding-window rate limit (30/min per IP on chat-completions, 100/min per agent pubkey on both routes). 429 responses include `X-RateLimit-*` headers.
- **Mainnet live** since 2026-05-21 (`SOLANA_NETWORK=mainnet-beta`). KMS-signed facilitator on Solana mainnet + devnet. Fee-payer SOL balance monitored via cron (page < 0.1 SOL).
- Base (EVM) — Base mainnet (`eip155:8453`) and Sepolia (`eip155:84532`) as first-class networks. ERC-3009 `transferWithAuthorization` against USDC, settled via `viem`. `verifyReceipt` branches on `payment.network`.
- Mainnet-ready controls: price cap (`NEXUS_MAX_PRICE_USDC` — challenge issuer 500s if `X402_FLAT_PRICE_USDC` exceeds it), payer allowlist (`NEXUS_ALLOWED_AGENTS` comma-list → 403 + `agent.not_allowed` log), mainnet kill switch (`NEXUS_MAINNET_ENABLED="false"` → 503 + `mainnet.disabled` log; testnets stay reachable), per-network deposit override (`NEXUS_MAINNET_DEPOSIT_ADDRESS`), `X-Nexus-Network` selector.

**Verifier + permalinks.**
- `verifyReceipt` in `@vdm-nexus/x402@0.4.0` — five-check: recompute prompt+response hashes, verify `nexus_signature`, fetch on-chain tx to confirm USDC transfer + payer match. `payment_on_chain_ok` + `payer_matches` are vacuously true on prepaid receipts.
- `verify.vdmnexus.com` — hosted verifier SaaS, embeddable iframe at `/embed?receipt=<base64>`. Shares the `verifyReceipt` code path.
- `/r/[id]` receipt permalinks — `@vercel/og` cards with prompt hash, model, cost, on-chain link. Twitter cards configured.

**Marketing/discovery surfaces.**
- `/playground` — ephemeral in-browser agent, sponsored one-shot credit, live receipt card.
- `/points` — per-agent leaderboard (inferences, USDC spent, verification rate). Updated via Supabase trigger on inference write.
- `/roadmap` + admin editor at `/admin/roadmap`.
- Gitlawb mirror (`gitlawb.com`) — agent-paid `git push` via the paywall package. Demo receipt: `vdmnexus.com/r/749fa37c`. Proves the paywall works against non-LLM resources.

**Agents on the rail.**
- **Ship-broadcast agent** (Phase 1, 2026-05-23) — first agent that lives on Nexus and pays its own way per call. `pnpm broadcast-agent <PR#>` drafts X / Farcaster / Telegram / LinkedIn posts via `X402Agent.pay_and_infer` on Solana mainnet; every draft footer carries the LLM-call receipt ID. Contract in `agents/ship-broadcast/prompt.md` (locked vocabulary, ten guardrails, JSON schema); orchestrator in `scripts/broadcast-agent.py`. Refreshes the "currently shipped" list from npm + PyPI per call so it can't reference unshipped surfaces. Picks a visual (VHS tape, silicon PNG, or skip). Writes drafts to `marketing/broadcasts/`; never schedules — `marketing/ship-broadcast.md` still owns posting. Acceptance receipts: [`r/2639c835`](https://vdmnexus.com/r/2639c835-1dd3-47a1-84aa-4cb2e3c6ef11) (PR #65 ship), [`r/895d38a9`](https://vdmnexus.com/r/895d38a9-19e3-4d7d-9adc-0f352e3f0769) (PR #66 fix), [`r/c21e59a3`](https://vdmnexus.com/r/c21e59a3-878c-452d-81da-b620d589544d) (docs-skip case). Phase 2 (cron / webhook auto-trigger) deferred.

**Packages (as of 2026-05-22).**
- npm: `@vdm-nexus/sdk@0.2.0`, `x402@0.4.0`, `paywall@0.1.0`, `mcp@0.1.0`, `ai-sdk-provider@0.1.0`, `mastra-provider@0.1.0`. All MIT, `prepublishOnly tsc`.
- PyPI: `vdm-nexus@0.2.2`, `langchain-vdm-nexus@0.1.0`. Python SDK first mainnet-live receipt: `r/00240cb0-41e1-4adc-a88c-9a11a7ffc959`.
- `@vdm-nexus/x402@0.3.0` is **deprecated** — pin `^0.4.0`.

**Spec + demo.**
- SIR v2 spec at `docs.vdmnexus.com/spec/sir-v2` — canonical JSON shape, signing rules, five verification checks.
- `pnpm --filter nexus demo` — seeds credits, runs three prompts, prints dropping balance.

### NOT built — explicit gaps

- **ERC-8004 agent card** — roadmap item 3. (Live on Ethereum mainnet 29 Jan 2026.)
- **x402 discovery listings** — Bazaar, Agentic.Market, x402.direct, awesome-x402. Roadmap item 2.
- **Framework adapters** — LangChain, LangGraph, Mastra, Vercel AI SDK, OpenAI Agents SDK, CrewAI, ElizaOS, SendAI, Coinbase AgentKit. Opt-in sub-packages.
- **MiCA legal opinion** — roadmap item 11. Required before active EU marketing or token launch.
- **`Agent.deposit()` / autonomous top-up** — deferred. Per-call x402 already closes the loop.
- **`@vdm-nexus/github-app`** — placeholder docs only. Plan: gates PR writes on x402 payment, posts receipt in PR body.
- **Web UI for agent management** — no balance/spend/key-rotation dashboard. Operators query Supabase directly.
- **Third-party security audit** — none scheduled.
- **Multi-provider routing intelligence** — OpenRouter is still the only upstream.
- **Markup / pricing strategy** — passed through 1:1. Economic model TBD.

## On-chain payment flow

```
   Agent wallet (Solana mainnet or Base)
        │
        │  signed USDC transfer to a Nexus deposit address
        │  (SPL transfer on Solana, ERC-3009 on Base)
        ▼
   Solana mainnet / Base mainnet
        │
        │  poll RPC every 2 min (Vercel Cron)
        ▼
   apps/nexus  (deposit watcher)
        │
        │  insert into credits_ledger with tx_signature, keyed by sender
        ▼
   Supabase                           Agent now has spendable balance.
        │
   inference requests signed by the agent's keypair drop the balance
   linearly; agents are expected to top themselves back up before
   running dry. There is no human-managed credit card path on this rail.

   The per-call path (x402 v2 on /chat/completions) skips the ledger
   entirely — payment lands inline with the request and the receipt
   references the settlement tx directly.
```

The agent's wallet is theirs. Nexus never holds private keys. The deposit
address is Nexus-owned; deposits credit the ledger keyed by the **sender's**
public key.

## Test wallets

Two test wallets live in `apps/nexus/.env.local`. They are **not
interchangeable** — running a mainnet smoke test with the devnet key
fails with `transaction_simulation_failed` (the devnet wallet has no
USDC ATA on mainnet), and vice versa. Always cross-check the agent
pubkey printed by the script against the table below before declaring
a test green.

| Network | Wallet pubkey | Env vars | Funded with |
|---|---|---|---|
| **Mainnet** | `BSKq2XtBCXHGZKvP9KStjJdpimTAJbmRP7FqZ1SBTshR` | `TEST_AGENT_PUBKEY` / `TEST_AGENT_SECRET` | Real mainnet USDC at `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **Devnet** | `4MGZ2rDwypbVm78SVUpJDbPPxg4WVhYyH2f2TA2WPS26` | `DEMO_AGENT_SECRET_KEY` | Devnet USDC via `faucet.circle.com` at `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

Operator-side addresses (Nexus, not agents):

| Role | Address | Notes |
|---|---|---|
| Deposit + facilitator fee payer | `4nTiDhEbCFJtfPsi49rPGam8R5azUQNZHpb49CLYxiSv` | Same address on both networks. KMS-signed in production (`NEXUS_KMS_KEY_ID`), in-memory secret in dev. |
| Receipt signing operator key | `9KADzhz…` (full key at `GET /api/v1/operator-key`) | Ed25519. Verifiers use this to check `receipt.nexus_signature`. |

Canonical runs for the two paths:

```bash
# Python SDK end-to-end on mainnet
export AGENT_SECRET_KEY=$TEST_AGENT_SECRET
python smoke_test_mainnet.py   # has a 5-sec Ctrl+C abort window

# TS SDK end-to-end on mainnet (the proven path; runs the verifier too)
source apps/nexus/.env.local && \
  DEMO_AGENT_SECRET_KEY=$TEST_AGENT_SECRET \
  NEXUS_ENDPOINT=https://nexus.vdmnexus.com \
  NEXUS_NETWORK=mainnet \
  pnpm --filter nexus test:payinfer

# Devnet smoke (Python; free)
export AGENT_SECRET_KEY=$DEMO_AGENT_SECRET_KEY
python smoke_test.py
```

The TS path was first proven live on 2026-05-21 (receipt
`c9710ea7-9e1f-46ee-aaa9-903a536ae12e`). The latest green run is
recorded in `vdmnexus.com/r/0d3a5b26-d688-4d93-bfdc-7555b1324ac1`
— same wallet, fresh on-chain settlement, five-check verification
passing end-to-end.

## Dev commands

```bash
pnpm install
pnpm --filter web build              # marketing site
pnpm --filter @vdm-nexus/sdk build              # SDK to dist/
pnpm --filter @vdm-nexus/x402 build             # x402 client + verifier
pnpm --filter @vdm-nexus/paywall build
pnpm --filter @vdm-nexus/mcp build
pnpm --filter @vdm-nexus/ai-sdk-provider build  # Vercel AI SDK drop-in
pnpm --filter @vdm-nexus/mastra-provider build  # Mastra drop-in
pnpm --filter nexus build                       # agent rail
pnpm --filter verify build           # verifier app
pnpm --filter docs build             # docs site
pnpm --filter web dev                # http://localhost:3000
pnpm --filter nexus dev              # http://localhost:3001
pnpm --filter verify dev             # http://localhost:3002
pnpm --filter docs dev               # http://localhost:3003
pnpm --filter nexus demo             # run the demo agent
```

## Conventions

- TypeScript everywhere. Strict mode. ESM in the SDK; Next.js conventions
  in the apps.
- The SDK keeps a tiny dependency surface (currently two runtime deps).
  Adding a third needs justification here.
- Marketing copy describes what's real; flagged "Coming soon" otherwise.
- All animations on the web app respect `prefers-reduced-motion`.
- All tables RLS-enabled. Inserts run server-side via the service role,
  never via the anon key.

## Ship broadcasts

Every ship worth surfacing fans out to four channels — X, Telegram,
Farcaster, LinkedIn — via Postiz. The convention:

- After a PR merges (or is open with green CI), the user runs
  `/ship-broadcast <PR#>` (or `/ship-broadcast latest`). When you see
  that trigger phrase, follow the workflow in
  [`marketing/ship-broadcast.md`](marketing/ship-broadcast.md): identify
  the PR, classify by title prefix, draft platform-specific posts,
  show drafts for review, then schedule via the `postiz:postiz` skill.
- That playbook is the single source of truth for voice, vocabulary,
  per-platform templates, character limits, and hard rules (e.g.
  "always link to a Nexus domain, never the GitHub PR"; "signed
  inference" is the locked noun, never "verifiable inference").
- Drafts are written to `marketing/broadcasts/<pr#>-<short-slug>.md`
  for review. The user approves per-platform before anything is
  scheduled. Skipping a platform is fine — partial broadcasts are
  expected.
- **Never auto-send.** Postiz scheduling always goes through a user
  approval gate, even for "post now" runs.
- **Default cadence**: max 1 X post per 4 hours unless materially
  different. Skip docs typos, silent refactors, most infra chores.
- **Token / financial-action posts** require explicit double
  confirmation from the user and surface the MiCA red-line warning
  from the section below. Never schedule without it.

When in doubt about whether a ship deserves a broadcast, ask the user
before drafting. Distribution PRs (e.g. AgentKit / SendAI / discovery
listings) broadcast only after the *upstream* PR merges, not on the
vdmnexus-side packet PR.

## Roadmap (locked 2026-05-22 after competitive-landscape research)

Rough order. **Speed-to-distribution beats feature work** — the
signed-inference-receipt niche is open today, but Coinbase / AWS / EigenAI
could close it inside 9–12 months. The Python SDK, public listings, and the
ERC-8004 card are the highest-leverage moves on the board because they all
multiply discovery of what's already shipped.

1. **`vdm-nexus` Python SDK.** The single biggest unlock. Every Python
   framework adapter — LangChain, LangGraph, CrewAI, OpenAI Agents SDK,
   Google ADK, Fetch.ai uAgents — is blocked on this. Port `Agent` +
   `signBody` + `inference` + the x402 client + `verifyReceipt` to
   Python. Two packages, mirror the TS shape. Ship to PyPI as
   `vdm-nexus` (PyPI doesn't allow scopes).
2. **Listings on the x402 discovery surfaces.** x402 Bazaar (CDP),
   Agentic.Market (Coinbase), x402.direct, awesome-x402. Zero-cost
   distribution. The indexes are where every new x402 dev lands first.
3. **ERC-8004 agent card.** Publish a card pointing at
   `/chat/completions` that declares Ed25519 verification + SIR v2 receipt
   format. ERC-8004 went live on Ethereum mainnet 29 Jan 2026,
   co-authored by Coinbase / MetaMask / Ethereum Foundation / Google. The
   cheapest way to ship on the agent-identity standard the rest of the
   ecosystem is rallying around.
4. **Coinbase AgentKit `vdm-nexus` action provider.** PR against
   `coinbase/cdp-agentkit` adding a Nexus action provider. Highest-
   visibility OSS contribution available — forces a Coinbase team
   review and puts Nexus in front of every AgentKit user.
5. **Mastra + Vercel AI SDK providers.** Both speak OpenAI-compat
   `/chat/completions` natively; a custom-fetch override is enough.
   Mastra had ~22K stars in March and 300K weekly npm downloads
   post-1.0 — the most Nexus-shaped TS framework alive.
6. **LangChain + LangGraph adapters.** Unlocked by item 1. LangGraph is
   the regulated-industry Python default; the audit-trail buyer's
   framework of choice.
7. **AI Act Article 12 / NIST AI Agent Standards / OWASP Top 10 one-pager.**
   Map SIR v2 fields to the audit-log requirements every observability
   vendor (Atlan, Galileo, Credo AI, Holistic AI, Langfuse, LangSmith)
   ships hash-chained logs against. The GRC sales asset. Pulled forward
   from the old item 9 because it doesn't depend on a MiCA legal opinion
   (the memo now sits in the Token block — item 11).
8. **SendAI Solana Agent Kit plugin.** PR `@solana-agent-kit/plugin-vdm-nexus`
   into the SendAI registry. Canonical surface for Solana agent devs.
9. **First regulated-industry pilot.** Spanish fintech, EU bank, or EU
   government RFP. One reference logo unlocks the next ten. Does not
   require the MiCA memo (item 11) — the pilot is about audit-log
   evidence, not about whether USDC settlement requires CASP authorisation.

### Phase 2 — token block (only after distribution shows real usage)

10. **Solana Foundation / Colosseum hackathon presence.** Distribution
    surface inside the Solana ecosystem that doesn't depend on any
    paid marketing.
11. **Spanish firm MiCA scoping memo — merchant-rail + token-issuance
    position.** Commission a 5–10 page scoping memo from a Spanish firm
    covering (a) the merchant-rail position under ESMA Q&A 2293 + MiCA
    Recital 87 + EBA Opinion EBA/Op/2025/08, (b) per-wire classification
    of the $NEXUS token mechanics under MiCA Art. 4(2) + ESMA March 2025
    Guidelines (utility vs. MiFID II Annex I instrument), and (c) whether
    a Spain-resident autónomo can issue under MiCA Art. 4 or must
    incorporate a Spanish SL first under Recital 22. Budget cap €15K;
    scoping memo first, binding opinion only if needed. Firm shortlist
    and full brief live in memory at
    [[project_mica_legal_scoping]]. Required before any active EU
    marketing of the token.
12. **Token launch — utility-first.** Solana-native (the product is
    Solana-native, pump.fun's USDC pair removes the SOL-volatility
    issue for a utility token). Fair launch, no presale, no team
    allocation, utility tied to inference (e.g. holder discount on
    `/chat/completions`). Only fires after items 1–10 are real.

### Phase 3 — platform / maturity (deferred items)

13. **`@vdm-nexus/wallet` + `Agent.deposit()`.** Demoted from the previous
    roadmap's #1. The per-call x402 path on `/chat/completions` already
    settles inline; an agent with a funded wallet pays forever without
    needing prepaid top-up. Ship only when a paying customer asks for it.
14. **Framework adapters round 2.** OpenAI Agents SDK, CrewAI (via the
    LangChain adapter), ElizaOS plugin, Fetch.ai uAgents.
15. **`@vdm-nexus/github-app`.** Agent-git GitHub App. Generalizes the
    gitlawb demo. Useful, not the wedge.
16. **Agent management web UI.** Balance dashboard, spend history,
    receipts feed, key rotation. Only when a paying customer asks for it.
17. **Multi-provider routing intelligence.** Replace the OpenRouter
    passthrough with per-request decisions on price + latency + quality.
    Needs paying traffic first to produce meaningful routing data.
18. **Third-party security audit.** Receipt format, facilitator, verifier.
    Required before any token / economic-layer work — schedule alongside
    the MiCA memo (item 11), not later.

### Kill criteria — replan if any of these trigger

- **Coinbase ships signed-inference receipts** (watch the x402 spec
  releases): pivot to MiCA-aware EU sales + compliance/audit-trail SaaS,
  not protocol-layer competition.
- **Skyfire raises >$20M and starts EU marketing**: accelerate the Spanish
  firm memo, publish the MiCA-aware positioning within 30 days.
- **x402 daily volume passes $1M/day** (Artemis baseline is ~$28K/day in
  March 2026): aggressive paid distribution — Coinbase Discord
  sponsorships, x402scan banner, EthCC + Solana Breakpoint presence.
- **x402 daily volume stays below $100K/day for six months**: assume the
  agentic-commerce thesis is slower than the VC narrative suggests.
  Tighten burn and focus on the compliance/audit-trail narrative — that
  one has independent demand.
- **CNMV (or any other major EU supervisor — BaFin, ACPR, AFM) publishes
  guidance specifically on agent-payment merchants**: rerun the legal
  opinion and update marketing within 30 days.

## MiCA red line — stay a merchant

Operationally critical. The whole "out of MiCA CASP scope" position rests
on ESMA Q&A 2293 (06 June 2025) + MiCA Recital 87 + EBA No-Action Letter
EBA/Op/2025/08 (10 June 2025): dealing on own account, where the service
provider is not acting on behalf of clients, is not a crypto-asset service
and does not require CASP authorisation. The founder is Spain-resident,
so the relevant supervisors are **CNMV** (conduct) and **Banco de España**
(prudential / EMT issues); AML supervision sits with **SEPBLAC** under
Ley 10/2010. Spain transposed MiCA via Royal Decree-Law 7/2024 and chose
a short transitional regime ending 30 December 2025 — from that date the
CNMV can enforce against unlicensed CASPs marketing services in Spain.

**The single behaviour that flips Nexus into MiCA + PSD2 scope is operating
its own x402 facilitator that settles third-party agent→merchant flows.**

Rules:

1. `apps/nexus/lib/local-facilitator.ts` settles Nexus's own merchant
   flow only. Do not expose it as a service. Do not let third parties
   point their resources at it.
2. Do not custody buyer USDC pre-funded balances on Nexus-controlled
   accounts beyond the existing credits ledger (which is a record of
   debts owed to Nexus for inference already delivered, not custodied
   client funds).
3. Do not pay interest, discounts, or duration-linked rebates on USDC
   balances. Volume discounts are fine; time-based ones are not (MiCA
   Art. 50).
4. When a paid 402 challenge needs an off-Nexus facilitator (other
   networks, scaling, ops), consume a third-party facilitator (Coinbase
   CDP, Cloudflare, PayAI). Never run one for others.
5. Active EU marketing waits for the Spanish firm memo (roadmap item 11,
   in the Token block). Until then, marketing is reverse-solicitation-safe:
   founder-led posts, organic discovery, no paid EU campaigns.

