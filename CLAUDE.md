# VDM Nexus

> Infrastructure for autonomous AI agents.

## What this repo is

A Turbo + pnpm monorepo with two apps and one open-source package:

```
apps/
  web/         ← Marketing site at vdmnexus.com (live)
  nexus/       ← Agent payment rail + inference API (in development)
packages/
  sdk/         ← @vdmnexus/sdk — open source, MIT
```

## Strategic stance

The marketing copy on vdmnexus.com positions Nexus Compute as a smart compute
router. Building a router *first* would put us in a crowded, low-margin market
(OpenRouter, Portkey, LiteLLM, AWS Bedrock, Vercel AI Gateway). The actual
wedge is the layer below: **autonomous AI agents that authenticate and pay
with a Solana keypair, with no API keys**.

So this codebase builds the agent payment rail first and proxies the
inference side to OpenRouter for now. Real routing intelligence is a later
session, after the rail is shipping value.

## Products

### Nexus Compute

What the site says: smart compute routing for AI businesses.
What's actually built: a thin OpenRouter passthrough, gated by Solana-signed
auth, with usage charged against an off-chain credit ledger.

### Nexus Agents

What the site says: infrastructure for autonomous on-chain agents.
What's actually built: agents authenticate with an Ed25519 keypair, sign
every request, and have credits debited from a Supabase ledger. **The
on-chain deposit side is not built yet** — credits are seeded manually by the
demo script. Closing that loop is the next session.

## Apps

### `apps/web` — marketing site

Next.js 15 App Router, React 19, Tailwind 3, Framer Motion, Supabase, Inter
via `next/font/google`. Mobile baseline 375px, all animations respect
`prefers-reduced-motion`.

**Public routes:** `/`, `/compute`, `/agents`, `/roadmap`.
**Admin routes:** `/admin/login`, `/admin/roadmap` (password-gated).
**API routes:** `/api/waitlist`, `/api/roadmap`, `/api/buildlog`,
`/api/roadmap/items[/:id[/move]]`, `/api/buildlog/:id`,
`/api/admin/{login,logout}`.

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
- `GET  /api/v1/deposit-address` — returns `{ address, mint, network }` so
  agents can discover where to send USDC
- `POST /api/v1/deposits/scan` — cron-triggered scanner; requires
  `CRON_SECRET` (Vercel Cron passes it via `Authorization: Bearer ...`,
  the `X-Cron-Secret` header is also accepted for manual triggers)

**Auth scheme.** Every request to `/v1/inference` carries:

- `X-Nexus-Pubkey: <base58 Ed25519 public key>` (32 bytes)
- `X-Nexus-Signature: <base58 Ed25519 signature>` (64 bytes, over the raw
  body bytes)

The body is JSON: `{ prompt, model, timestamp, nonce }`. The server:

1. Verifies the signature with `tweetnacl` against the raw body bytes.
2. Rejects when `timestamp` is more than `NEXUS_REQUEST_MAX_AGE_SECONDS`
   away from now (default 60s — replay protection).
3. Rejects reused `(agent_pubkey, nonce)` via a unique index on the credits
   ledger.
4. Auto-registers the agent in `public.agents` if first seen.
5. Checks `balance_usdc > 0` via the `agent_balances` view.
6. Calls OpenRouter with `usage.include = true`, debits the returned
   `usage.cost`, writes an `inference_logs` row.
7. Returns the completion plus the new remaining balance.

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

### `packages/sdk` — `@vdmnexus/sdk`

MIT, TypeScript, ESM-only. Two runtime deps: `tweetnacl` and `bs58`. Builds
with `tsc` to `dist/`.

```ts
import { Agent } from "@vdmnexus/sdk";

const agent = Agent.generate();
const reply = await agent.inference("https://nexus.vdmnexus.com/api/v1", {
  prompt: "...",
  model: "openai/gpt-4o-mini",
});
```

The class owns the keypair and handles signing. It does NOT depend on
`@solana/web3.js` — that comes later when wallet operations (deposits,
transfers) get added.

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
  `(agent_pubkey, request_nonce)` for replay protection.
- `agent_balances` view — `sum(delta_usdc)` per agent
- `inference_logs` — every call, including failures, with token counts and
  latency

All tables have RLS enabled. The agent rail tables have **no policies** —
only the service role touches them, server-side from `apps/nexus`.

## Environment variables

### `apps/web/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IP_HASH_SALT=
ADMIN_PASSWORD=          # protects /admin/* and admin write endpoints
RESEND_API_KEY=          # optional
RESEND_FROM=             # optional, e.g. hello@vdmnexus.com
SLACK_WEBHOOK_URL=       # optional
```

### `apps/nexus/.env`

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
NEXUS_DEPOSIT_ADDRESS=               # Solana pubkey agents send USDC to
NEXUS_DEPOSIT_SECRET_KEY=            # devnet only; mainnet must use a KMS
CRON_SECRET=                         # required by /api/v1/deposits/scan
SOLANA_NETWORK=devnet                # devnet for v1
SOLANA_RPC_URL=                      # optional; defaults to public RPC
NEXUS_USDC_MINT=                     # optional override (test mints)
NEXUS_DEPOSIT_SCAN_LIMIT=50          # optional
NEXUS_REQUEST_MAX_AGE_SECONDS=60     # optional
```

Demo script also reads:

```
NEXUS_ENDPOINT=http://localhost:3001/api/v1
DEMO_AGENT_SECRET_KEY=               # base58 64 bytes; generated if blank
DEMO_SEED_USDC=1.00
```

## Built vs. not built

### Built

- Ed25519 agent identity (Solana-compatible)
- Signed-request auth with timestamp window + nonce replay protection
- Off-chain credits ledger (append-only deltas, balance view)
- OpenRouter passthrough, cost reconciled from upstream `usage`
- `@vdmnexus/sdk` — `Agent.generate()`, `Agent.fromBase58()`, `.inference()`
- Demo script: `pnpm --filter nexus demo` seeds credits, runs three
  prompts, prints the dropping balance
- **On-chain deposit detection.** Polls Solana RPC every 2 minutes (Vercel
  Cron), parses USDC transfers to `NEXUS_DEPOSIT_ADDRESS`, credits the
  ledger keyed by sender pubkey. Idempotent via unique `tx_signature` index.
- Public roadmap page (`/roadmap`) on apps/web with live build log + admin
  editor at `/admin/roadmap`.

### NOT built — explicit non-goals

- **Mainnet.** Devnet only. The deposit secret key currently lives in
  `apps/nexus/.env` (fine for devnet, unacceptable for mainnet). Switch
  behind `SOLANA_NETWORK=mainnet-beta` only after moving the key to a real
  KMS and stress-testing deposit detection on devnet.
- **SDK helper to send USDC.** `Agent.deposit()` would let agents top
  themselves up; needs `@solana/web3.js` + `@solana/spl-token`. Deferred
  until the SDK package split (`@vdmnexus/wallet`) makes the dep cost
  justifiable.
- **Multi-provider routing.** OpenRouter is the only upstream. Real
  routing intelligence comes after the agent rail is in customer hands.
- **A web UI.** No `/admin`, no balance dashboard. The waitlist `/admin`
  page is owed from the earlier session; agents UI is its own session.
- **Hermes / agent frameworks.** An earlier session prompt proposed
  Hermes as the execution runtime. Rejected — Hermes is an agent loop,
  not an execution layer. Framework adapters (Hermes, LangGraph, Mastra,
  OpenAI Assistants) belong in the SDK as opt-in bindings, not as a
  platform mandate.
- **Markup / pricing strategy.** OpenRouter cost is passed through 1:1.
  The economic model (subscription, markup, token) is undecided.

## Target on-chain payment flow

```
   Agent wallet (Solana)
        │
        │  signed USDC transfer to a Nexus deposit address
        ▼
   Solana mainnet (devnet for v1)
        │
        │  Helius webhook on confirmed tx, or poll
        ▼
   apps/nexus  (deposit watcher)
        │
        │  insert into credits_ledger with tx_signature
        ▼
   Supabase                           Agent now has spendable balance.
        │
   inference requests signed by the agent's keypair drop the balance
   linearly; agents are expected to top themselves back up before
   running dry. There is no human-managed credit card path on this rail.
```

The agent's wallet is theirs. Nexus never holds private keys. The deposit
address is Nexus-owned; deposits credit the ledger keyed by the **sender's**
public key.

## Dev commands

```bash
pnpm install
pnpm --filter web build              # marketing site
pnpm --filter @vdmnexus/sdk build    # SDK to dist/
pnpm --filter nexus build            # agent rail
pnpm --filter web dev                # http://localhost:3000
pnpm --filter nexus dev              # http://localhost:3001
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

## Roadmap (rough order)

1. **On-chain deposit detection.** Watch a Nexus-owned Solana account for
   incoming USDC, credit the ledger keyed by the sender. Webhook via
   Helius.
2. **Auto-topup demo.** SDK helper that signs+sends USDC when balance
   crosses a threshold. End-to-end "agent that tops itself up."
3. **`/admin` views.** Waitlist admin (owed from earlier session) + an
   agents admin for balances and recent inferences.
4. **Real multi-provider routing.** Replace OpenRouter passthrough with
   per-request decisions on live price + latency + quality.
5. **Framework adapters in the SDK.** LangGraph / Mastra / OpenAI
   Assistants bindings.

## What older commits looked like

Commits `33cd01f..185f30d` contained an Express prototype API, a
Sophie/RushFiles chat product under `apps/vdmvastgoed`, a shared
`packages/ui`, and a Docker Compose stack with Postgres/Redis/Caddy. All
removed in the cleanup commit. Anything from that era is still recoverable
via `git checkout 185f30d -- <path>`.
