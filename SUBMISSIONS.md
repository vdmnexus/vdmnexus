# x402 discovery — submission packets

Ready-to-submit text for the four x402 discovery surfaces. The user
submits by hand after this PR merges.

Roadmap: **Phase 1 / Distribution / #2.**

Anchor positioning across every packet:

> Signed inference — AI agents pay per call in USDC on Solana mainnet
> (and Base) and get a cryptographically verifiable receipt of the
> model's response.

Cite-everywhere artifacts:

- First mainnet receipt: <https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e>
- Verifier (paste-a-receipt UI): <https://verify.vdmnexus.com>
- Docs: <https://docs.vdmnexus.com>
- SIR v2 spec: <https://docs.vdmnexus.com/docs/spec/sir-v2>
- Source (MIT): <https://github.com/vdmnexus/vdmnexus>
- npm: `@vdm-nexus/sdk`, `@vdm-nexus/x402`, `@vdm-nexus/paywall`,
  `@vdm-nexus/mcp`, `@vdm-nexus/ai-sdk-provider`,
  `@vdm-nexus/mastra-provider`
- PyPI: `vdm-nexus` (`pip install vdm-nexus`)
- Pricing: **$0.01 USDC flat per call** (x402-gated `/chat/completions`)

---

## 1. x402 Bazaar (Coinbase CDP)

The Bazaar is the canonical semantic-search index for x402-enabled
services. It powers Agentic.Market under the hood (same backend). There
is **no manual submission step** — the CDP Facilitator catalogs an
endpoint the first time it settles a payment for that endpoint with the
`bazaar` discovery extension declared. Listing is therefore a code +
config change, not a form.

### (a) Submission URL / target

- Discovery docs: <https://docs.cdp.coinbase.com/x402/bazaar>
- Browse / verify the listing: <https://agentic.market>
  and `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`
- No form. Indexing is automatic after the first CDP-facilitator
  settlement of a payment against a Bazaar-extension-declaring route.

### (b) Exact text — the `declareDiscoveryExtension` block

Drop the following into the `/chat/completions` route's `accepts[*]`
extension map. This is the literal copy-paste-ready manifest:

```ts
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

extensions: {
  ...declareDiscoveryExtension({
    discoverable: true,
    input: {
      method: "POST",
      body: {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello, world." }],
      },
    },
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description:
            "OpenAI-compatible model slug. Examples: openai/gpt-4o-mini, anthropic/claude-haiku, meta-llama/llama-3-70b-instruct.",
        },
        messages: {
          type: "array",
          description:
            "OpenAI chat messages array — [{ role, content }, ...].",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["system", "user", "assistant"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
      },
      required: ["model", "messages"],
    },
    output: {
      example: {
        id: "chatcmpl-…",
        object: "chat.completion",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Hello!" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 },
      },
    },
    description:
      "Signed inference — pay per call in USDC on Solana mainnet (or Base) and get a cryptographically verifiable receipt of the model's response. OpenAI-compatible /chat/completions. Receipt is a v:2 SIR (Signed Inference Receipt), Ed25519 over a canonical JSON of prompt-hash, response-hash, model, cost, and settlement tx, verifiable against the public operator key at /api/v1/operator-key.",
  }),
},
```

### (c) Required metadata

| Field | Value |
|---|---|
| Category (CDP-inferred from description) | `Inference` |
| Tags (semantic, derived from description) | signed inference, verifiable inference, receipts, ed25519, solana, base, openai-compatible, sir-v2 |
| Networks | `solana:mainnet`, `solana:devnet`, `eip155:8453` (Base), `eip155:84532` (Base Sepolia) |
| Asset | USDC |
| Price | 0.01 USDC flat |
| Resource URL | <https://nexus.vdmnexus.com/api/v1/chat/completions> |
| pay-to (Solana) | the value of `NEXUS_DEPOSIT_ADDRESS` in prod env |
| pay-to (Base) | the value of `BASE_DEPOSIT_ADDRESS` in prod env |

### (d) Prerequisites

1. **Land the extension in `apps/nexus/app/api/v1/chat/completions/route.ts`.**
   Today the 402 response carries `accepts` but no `extensions.bazaar`
   block. Add the snippet from (b) so it appears inside every
   `PaymentRequirements` entry (or once on the parent
   `PaymentRequired` body — both shapes are supported by `@x402/core`).
   Tracked as a separate PR after this packet merges; **not in scope for this PR**.
2. **Route settlement through the CDP facilitator at least once.**
   The local KMS-signed facilitator (`NEXUS_FACILITATOR_LOCAL=true`)
   does *not* trigger Bazaar indexing — only CDP-settled payments do.
   Two options:
   - Set `X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402`
     (and `X402_FACILITATOR_API_KEY`) and let CDP settle the first
     production payment. After indexing, optionally flip back to the
     local facilitator — the Bazaar entry persists.
   - Or: ship one synthetic mainnet call from any agent against the
     CDP-facilitated config. 0.01 USDC, one-time cost to seed the index.
3. **MiCA red line.** Both options above keep Nexus settling **its own
   merchant flow**, never third-party flows. We never run a facilitator
   for others. (Rule 1 of the MiCA red line in CLAUDE.md.)

### (e) How the user verifies the listing went live

- Hit `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=signed+inference`
  and look for the `nexus.vdmnexus.com` resource entry.
- Or browse <https://agentic.market>, filter to **Inference**, search
  "signed" or "verifiable" — Nexus should appear inside ~24h of the
  first CDP-settled payment.
- Status field on the extension response: `processing` immediately,
  resolves to indexed once async cataloging completes.

---

## 2. Agentic.Market (Coinbase)

Agentic.Market is the human-facing storefront for the Bazaar index.
**There is no separate submission step or form.** Same backend, same
catalog. Once Nexus is in the Bazaar (target #1 above), it appears on
agentic.market automatically.

### (a) Submission URL / target

- Storefront: <https://agentic.market>
- Announcement: <https://www.coinbase.com/developer-platform/discover/launches/agentic-market>
- Submission flow: **none**. Inherits from Bazaar (#1 above).

### (b) Exact text — copy this into the `description` field of the
Bazaar extension (already included in #1). Reproduced here standalone
so the user has a clean storefront blurb if Coinbase ever adds a manual
override path:

> **Nexus — signed inference**
>
> OpenAI-compatible `/chat/completions` for autonomous agents. Pay per
> call in USDC on Solana mainnet (or Base) via x402, and get a
> cryptographically verifiable receipt of the model's response —
> Ed25519-signed by the operator over the canonical JSON of the
> prompt hash, response hash, model, cost, and on-chain settlement
> tx. Verifies in three lines via `@vdm-nexus/x402` or at
> verify.vdmnexus.com. SIR v2 spec, MIT source, audit-trail-ready.
> $0.01 USDC flat per call.

### (c) Required metadata

| Field | Value |
|---|---|
| Category | **Inference** (one of the 7 storefront categories: reasoning, data, media, search, social, infrastructure, trading — Inference / reasoning is the right home) |
| Display name | Nexus |
| Description | see (b) |
| Logo / icon | `apps/web/public/icon.png` (deployed at <https://vdmnexus.com/icon.png>) |
| Website | <https://vdmnexus.com> |
| Docs | <https://docs.vdmnexus.com> |
| Pricing | $0.01 USDC flat |
| Networks | Solana mainnet, Base mainnet |

### (d) Prerequisites

Same as Bazaar (#1):

1. Land the `declareDiscoveryExtension` block in the
   `/chat/completions` route.
2. One CDP-settled payment to seed the index.

### (e) How the user verifies the listing went live

- Visit <https://agentic.market>, filter by **Inference**, look for
  the Nexus card.
- If Coinbase add a curation review queue for the front-page rail
  (announced in the launch post but not yet visible in the UI), reach
  out via the CDP developer Discord, channel `#x402`, with a link to
  the first mainnet receipt (`vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e`).

---

## 3. x402.direct (Merit-Systems / x402-index)

x402.direct is the community discovery index. The canonical backing
repo is `x402-index/x402-discovery-index`. Submission is via a GitHub
issue, not a PR.

### (a) Submission URL / target

- Open an issue at:
  <https://github.com/x402-index/x402-discovery-index/issues/new>
- Index browsable at: <https://x402.direct> (also indexed by
  <https://x402scan.com>, which auto-scans this registry every 6h)

### (b) Exact text — copy-paste into the issue

**Issue title:**

```
List: Nexus — Signed inference (Solana mainnet, Base mainnet), $0.01 USDC per call
```

**Issue body:**

```
**Endpoint URL:** https://nexus.vdmnexus.com/api/v1/chat/completions

**x402 payment address:**
- solana:mainnet — <NEXUS_DEPOSIT_ADDRESS, paste the actual address from env>
- eip155:8453 (Base mainnet) — <BASE_DEPOSIT_ADDRESS, paste the actual address from env>

**Description:**
Nexus is signed inference for autonomous agents — OpenAI-compatible
/chat/completions, pay per call in USDC on Solana mainnet (or Base)
via x402, and get a cryptographically verifiable receipt of the
model's response. Receipt is Ed25519-signed by the operator over a
canonical JSON of the prompt hash, response hash, model, cost, and
on-chain settlement tx. Verifies in three lines via
`@vdm-nexus/x402` or at https://verify.vdmnexus.com. SIR v2 spec
published, MIT source.

**Networks:** solana:mainnet, solana:devnet, eip155:8453 (Base),
eip155:84532 (Base Sepolia)

**Asset:** USDC

**Price:** 0.01 USDC flat per call

**Schemes:** exact

**Receipt spec:** SIR v2 — https://docs.vdmnexus.com/docs/spec/sir-v2

**First mainnet receipt (proof of life):**
https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e

**Hosted verifier:** https://verify.vdmnexus.com

**Docs:** https://docs.vdmnexus.com

**Source (MIT):** https://github.com/vdmnexus/vdmnexus

**SDKs:**
- TypeScript: `npm i @vdm-nexus/sdk @vdm-nexus/x402`
- Python: `pip install vdm-nexus`
- MCP: `npx -y @vdm-nexus/mcp`

**Contact:** dennis@vdmnexus.com
```

### (c) Required metadata

The repo's submission template only requires three fields (endpoint,
payment address, description). Everything else above is bonus signal
to make the listing higher-quality and more likely to be picked up by
x402scan / awesome-x402 auto-mirrors.

### (d) Prerequisites

- None. The endpoint is live on mainnet today.
- The actual deposit addresses must be pasted in before submitting —
  the placeholders above are deliberate (we don't commit prod
  addresses to git in this doc).

### (e) How the user verifies the listing went live

- Maintainers commit to verify and list within 24h.
- Check <https://x402.direct> and <https://x402scan.com> 24–48h after
  the issue closes. The Nexus row should appear with `Inference` tag
  and the supplied networks.
- If after 72h there's no movement, ping the maintainer in the issue
  thread (Merit-Systems is responsive).

---

## 4. awesome-x402 (GitHub awesome-list)

Two parallel forks exist; both should get a PR. Merit-Systems is the
canonical / smaller one (linked from x402.org); xpaysh is the larger,
more aggressively-curated mirror that gets more traffic from the
"awesome-x402" Google query.

### (a) Submission URL / PR target

- **Primary:** `Merit-Systems/awesome-x402` — fork, branch, PR against
  `master`. PR URL pattern: <https://github.com/Merit-Systems/awesome-x402/compare/master...vdmnexus:awesome-x402:add-nexus>
- **Secondary:** `xpaysh/awesome-x402` — fork, branch, PR against
  `main`. PR URL pattern: <https://github.com/xpaysh/awesome-x402/compare/main...vdmnexus:awesome-x402:add-nexus>

### (b) Exact text

#### For `Merit-Systems/awesome-x402` (terse style; one-liner under **Ecosystem**)

Insert this line in the **Ecosystem** section, alphabetically (Nexus
sits after "Merit Systems"):

```
- [Nexus](https://vdmnexus.com) - Signed inference for autonomous agents. OpenAI-compatible `/chat/completions` gated by x402 on Solana mainnet and Base, with a cryptographically verifiable Ed25519 receipt of every model response (SIR v2). $0.01 USDC per call. ([Docs](https://docs.vdmnexus.com)) ([Spec](https://docs.vdmnexus.com/docs/spec/sir-v2)) ([Verifier](https://verify.vdmnexus.com)) ([GitHub](https://github.com/vdmnexus/vdmnexus))
```

Also add this line to the **Open Source & SDKs** section, under the
TypeScript / JS subsection:

```
- [@vdm-nexus/sdk, @vdm-nexus/x402, @vdm-nexus/paywall, @vdm-nexus/mcp](https://github.com/vdmnexus/vdmnexus) - TypeScript SDKs for signed-inference x402: Ed25519 agent identity, x402 client + `verifyReceipt`, drop-in Express/Hono/Next paywall middleware, and MCP server for Claude Desktop / Cursor. MIT.
```

And one line under **Example Apps**:

```
- [vdmnexus.com/playground](https://vdmnexus.com/playground) - Zero-signup signed-inference console. Generates an ephemeral agent key in-browser, makes a sponsored x402-gated call, renders the live response and verifiable receipt card.
```

**PR title:** `Add Nexus — signed inference for autonomous agents`

**PR body:**

```
Adds Nexus to Ecosystem, Open Source & SDKs, and Example Apps.

Nexus is an x402-gated, OpenAI-compatible /chat/completions endpoint
on Solana mainnet and Base. Every paid call returns a cryptographically
verifiable Ed25519 receipt of the model response (SIR v2). $0.01 USDC
flat. First mainnet receipt:
https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e

Verifier (paste-a-receipt UI): https://verify.vdmnexus.com
Docs: https://docs.vdmnexus.com
Spec: https://docs.vdmnexus.com/docs/spec/sir-v2
Source (MIT): https://github.com/vdmnexus/vdmnexus

All three entries follow the existing alphabetical placement and
formatting conventions. No new sections added.
```

#### For `xpaysh/awesome-x402` (richer style; under **AI Agent Integration → Agent Verification & Security**)

Insert this entry alphabetically in the **Agent Verification &
Security** subsection (after "Agent Passport System (APS)", before any
"V…" entries):

```
- [Nexus — Signed Inference](https://vdmnexus.com) - OpenAI-compatible `/chat/completions` for autonomous agents, gated by x402 on Solana mainnet and Base. Every paid call returns a v:2 Signed Inference Receipt — Ed25519 over a canonical JSON of the prompt hash, response hash, model, cost, and on-chain settlement tx — verifiable in three lines via `@vdm-nexus/x402` or at verify.vdmnexus.com. $0.01 USDC flat per call. SIR v2 spec, MIT source. ([GitHub](https://github.com/vdmnexus/vdmnexus)) | ([Docs](https://docs.vdmnexus.com)) | ([Spec](https://docs.vdmnexus.com/docs/spec/sir-v2)) | ([Verifier](https://verify.vdmnexus.com)) | ([Playground](https://vdmnexus.com/playground)) | ([npm](https://www.npmjs.com/package/@vdm-nexus/sdk)) | ([PyPI](https://pypi.org/project/vdm-nexus/))
```

Also add one entry under **SDKs & Client Libraries → TypeScript /
JavaScript**:

```
- [@vdm-nexus/sdk](https://www.npmjs.com/package/@vdm-nexus/sdk) - Ed25519 agent identity + signed-request inference client for the Nexus signed-inference rail. Two runtime deps (tweetnacl, bs58), ESM-only. Companion packages: `@vdm-nexus/x402` (x402 client + `verifyReceipt`), `@vdm-nexus/paywall` (Express/Hono/Next.js middleware), `@vdm-nexus/mcp` (MCP server), `@vdm-nexus/ai-sdk-provider`, `@vdm-nexus/mastra-provider`. MIT.
```

And one under **SDKs & Client Libraries → Python**:

```
- [vdm-nexus](https://pypi.org/project/vdm-nexus/) - Python port of the Nexus SDK + x402 client + `verify_receipt`. `pip install vdm-nexus`. MIT.
```

And one under **AI Agent Integration → Model Context Protocol (MCP)**:

```
- [@vdm-nexus/mcp](https://www.npmjs.com/package/@vdm-nexus/mcp) - MCP server exposing Nexus signed-inference as a tool surface inside Claude Desktop and Cursor. Ships `nexus_chat`, `nexus_verify_receipt`, and `nexus_deposit_address`. Configured via `.mcp.json`; holds the agent secret key and handles the 402 handshake transparently.
```

**PR title:** `Add Nexus — signed-inference rail (Solana + Base) under AI Agent Integration`

**PR body:**

```
Adds Nexus to Agent Verification & Security, SDKs & Client Libraries
(TypeScript + Python), and Model Context Protocol.

Nexus is a signed-inference rail: OpenAI-compatible /chat/completions
gated by x402 on Solana mainnet and Base, with every paid call
returning a cryptographically verifiable Ed25519 receipt (SIR v2) of
the model response. $0.01 USDC flat.

- First mainnet receipt:
  https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e
- Hosted verifier: https://verify.vdmnexus.com
- Docs: https://docs.vdmnexus.com
- Spec (SIR v2): https://docs.vdmnexus.com/docs/spec/sir-v2
- Source (MIT): https://github.com/vdmnexus/vdmnexus
- npm: @vdm-nexus/sdk, @vdm-nexus/x402, @vdm-nexus/paywall,
  @vdm-nexus/mcp, @vdm-nexus/ai-sdk-provider, @vdm-nexus/mastra-provider
- PyPI: vdm-nexus

Entries follow existing formatting conventions and placement. No
new sections added.
```

### (c) Required metadata

Both repos use the same minimal contract: `[Name](url) - description.`
No frontmatter, no tags file, no JSON manifest. Sub-bullets and
parenthesized link clusters are conventional but optional.

### (d) Prerequisites

- None. The endpoint, packages, docs, verifier, and playground are
  all live today.
- Fork each repo to `vdmnexus/awesome-x402` (or the user's personal
  fork) before opening the PR.

### (e) How the user verifies the listing went live

- PR merges → entry appears on the README within minutes.
- x402scan auto-scans `awesome-x402` every 6h; expect a Nexus row in
  the x402scan ecosystem index within a day of the Merit-Systems PR
  merging.
- If a maintainer suggests moving the entry to a different subsection,
  do so without arguing — keep the goal (being indexed) ahead of the
  preferred placement.

---

## Submission order (recommended)

The four targets compound, so run them in this order:

1. **awesome-x402 PRs (both forks)** — pure markdown, zero
   prerequisites, fastest to land. Compounds discovery before the
   Bazaar code change ships.
2. **x402.direct issue** — 5-minute submission; 24h indexing turnaround.
3. **Land the `declareDiscoveryExtension` code PR on
   `apps/nexus/app/api/v1/chat/completions/route.ts`** (separate from
   this PR — this packet is markdown-only).
4. **Trigger one CDP-facilitated payment** against the new route, and
   Bazaar + Agentic.Market index automatically.

Total elapsed time from this PR merging to all four surfaces showing
Nexus: ~3 working days. Total cost: ~0.01 USDC + however long the
Bazaar extension PR takes to review and ship.
