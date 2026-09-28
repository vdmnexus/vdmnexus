# Nexus Cards — v1 spec

**Status**: spec — ready for build next session
**Drafted**: 2026-05-24
**Builds on**: `apps/web/app/og/route.tsx` (the parameterised OG card route shipped in [#105](https://github.com/vdmnexus/vdmnexus/pull/105))

## What this is

A signed-media primitive on the Nexus rail. Agents (and humans) call a paid endpoint with structured content; get back a branded PNG plus a hash-anchored signed receipt. Same shape as the inference rail: pay-per-call, x402-gated, SIR-style receipt.

The pitch when v1.1 ships: **"Agents on Nexus produce verifiable visual output of their own activity — receipts, status cards, ship cards, agent profiles — through the same paid-call rail they use for inference."**

The product positioning is *signed media* alongside *signed inference* — two media types, one trust model.

## Versions

| Version | Scope | Why |
|---|---|---|
| **v0 (today)** | `/og` route on `vdmnexus.com`. One template, query-param driven. Free, unsigned, ad-hoc. | Already shipped (#105). Got us through today's broadcast need. Throwaway path. |
| **v1** | Multi-template card service at `nexus.vdmnexus.com/api/v1/cards/[template]`. 5 templates. Same chrome. PNG hash returned in response. Free during bootstrap (no x402 enforcement yet). | Get the consistency win for our broadcasts + early agent use. Real surface, real path, easy to flip to paid later. |
| **v1.1** | Light up x402 gating + signed receipts. `$0.001` per render. Receipt covers `{ template, params_hash, png_hash, payment }`. | Turns it into a real paid product on the rail. Triggers when the first agent wants to call it for real. |
| **v2** | 1:1 + 9:16 aspect ratios. More templates. Public template gallery. Add to `/openapi.json`, `/.well-known/x402.json`. Maybe MCP tool too. | Full product story. Discovery surfaces light up. |

This spec covers v1. v1.1 and v2 are tracked as follow-ups.

## API contract (v1)

### Path

```
GET https://nexus.vdmnexus.com/api/v1/cards/{template}?<params>
POST https://nexus.vdmnexus.com/api/v1/cards/{template}      (body: JSON params)
```

GET works for simple cases (and is what the X composer auto-cards off when pasted as a URL). POST is the agent path — lets agents send larger payloads (e.g. a full receipt JSON for the `receipt` template) without URL-length limits.

### Response

For GET requests: PNG bytes directly (`Content-Type: image/png`). Headers carry the metadata:

```
Content-Type: image/png
X-Card-PngHash: <sha256 hex of the PNG bytes>
X-Card-Template: <template name>
X-Card-ParamsHash: <sha256 hex of the canonical-JSON params>
Cache-Control: public, max-age=3600, s-maxage=86400
```

For POST requests: JSON envelope so the agent gets metadata in the body:

```json
{
  "ok": true,
  "url": "https://nexus.vdmnexus.com/api/v1/cards/<template>?<params>",
  "png_hash": "<sha256 hex>",
  "params_hash": "<sha256 hex>",
  "template": "<template>"
}
```

The `url` is stable and cacheable — same params = same URL = same PNG = same hash. Agents can store the URL and reference it later.

### Errors

- `400` — invalid template name or missing required params for that template
- `404` — data lookup failed (e.g. `receipt` template with unknown id)
- `429` — rate-limited (per-IP for v1; per-agent in v1.1)

## Templates (v1 ships 5)

All templates share the same chrome: `N` mark + "VDM Nexus" wordmark top-left, optional badge slot, eyebrow pill top-right, indigo radial bg + grid pattern, footer split (left dot + url, right uppercase domain). 1200×630.

### `milestone` — human-driven

What `og-three-weeks.png` is today. Big headline + subhead + eyebrow + badge.

| Param | Required | Notes |
|---|---|---|
| `headline` | yes | Big white headline. Auto-shrinks past ~38 chars. |
| `subhead` | no | Smaller paragraph below. ~150 char max readable. |
| `eyebrow` | no | Top-right pill (default `BUILDING IN PUBLIC`). |
| `badge` | no | Small pill next to wordmark (e.g. `BETA`). |

### `proof` — human-driven

Replaces the silicon-rendered "discovery-surfaces" card. Same chrome, but the body is a table of paths + statuses. Used when the news IS the data.

| Param | Required | Notes |
|---|---|---|
| `headline` | yes | Smaller headline (the topic — e.g. "agent-discovery surface check"). |
| `rows` | yes | JSON array of `[label, status, kind]` triples. Renders as a monospace table. Max ~10 rows readable. |
| `footer_note` | no | Single-line tagline under the table. |

GET param encoding for `rows`: base64-encoded JSON to keep URLs sane. POST passes the array directly.

### `ship` — human-driven, used by ship-broadcast workflow

The ship-broadcast agent's standard output. PR-shaped framing.

| Param | Required | Notes |
|---|---|---|
| `pr` | yes | PR number. Badge color picks from type: `feat:` indigo, `fix:` blue, etc. |
| `type` | yes | `feat`/`fix`/`docs`/etc. |
| `title` | yes | PR title (auto-shrinks past long titles). |
| `outcome` | no | One-line "what this unlocks" subhead. |

### `receipt` — agent-callable

Renders a SIR v2 receipt as a shareable image. Input is a receipt id; the route fetches from Supabase. This is the agent's "proof of activity" card — usable as an X attach, an iMessage preview, a Discord embed.

| Param | Required | Notes |
|---|---|---|
| `id` | yes | The `inference_id` (UUID) or on-chain `tx_signature`. Same as `/api/v1/receipts/[lookup]` lookups. |
| `style` | no | `detail` (default — model + cost + hashes visible) or `summary` (just model + cost + agent). |

This template depends on the same lookup logic as the existing `apps/nexus/app/api/v1/receipts/[lookup]/route.ts`. Refactor that lookup into a shared lib.

### `agent-card` — agent-callable

An agent's "business card". Input is a pubkey; the route fetches stats from Supabase.

| Param | Required | Notes |
|---|---|---|
| `pubkey` | yes | Base58 Ed25519 pubkey. |

Body renders: agent label (if set), pubkey (truncated middle), points total, total calls, first-seen date, last-call date. Footer points at `console.vdmnexus.com/a/<pubkey>`.

Agents can drop this URL into their own bios, profiles, or shared dashboards. Crawlers see a branded card.

## Architecture

### File layout

```
apps/nexus/
  app/api/v1/cards/
    [template]/route.tsx        ← GET + POST handler, dispatches to template renderer
    _chrome.tsx                  ← Shared header/footer/bg JSX, brand constants
    _templates/
      milestone.tsx
      proof.tsx
      ship.tsx
      receipt.tsx                ← imports the receipt-lookup lib
      agent-card.tsx             ← queries Supabase for agent stats
    _lib/
      hash.ts                    ← canonicalize params, sha256(png), sha256(params)
      caip.ts                    ← network slug helpers (already exists in nexus app, reuse)
```

The route lives on `apps/nexus` (not `apps/web`) because this IS an agent rail product, same origin as the rest of the API. The existing `apps/web/app/og/route.tsx` from v0 stays for now (don't break the URL we already used for today's broadcast); we'll redirect it to the new path once v1 is live + tested.

### Shared chrome

Single React component, takes a `children` slot. Templates fill the slot:

```tsx
<NexusCardChrome
  eyebrow="WEEK 3 · BUILDING IN PUBLIC"
  badge="BETA"
  footerLeft="vdmnexus.com"
  footerRight="VDMNEXUS.COM"
>
  <MilestoneBody headline={...} subhead={...} />
</NexusCardChrome>
```

Brand constants (`BG`, `INDIGO`, `MUTED`, etc.) live in `_chrome.tsx`. Currently duplicated across `apps/web/app/r/[id]/og-image.tsx`, `apps/web/app/roadmap/opengraph-image.tsx`, and `apps/web/app/og/route.tsx` — v1 consolidates them in one place.

### PNG hash

`ImageResponse` returns a `Response` object whose body is the PNG bytes. To hash:

```ts
const res = new ImageResponse(jsx, opts);
const buf = await res.arrayBuffer();
const png_hash = createHash('sha256').update(Buffer.from(buf)).digest('hex');
return new Response(buf, {
  headers: {
    'Content-Type': 'image/png',
    'X-Card-PngHash': png_hash,
    // ...
  },
});
```

Slight overhead vs streaming, but PNG sizes are ~100-200KB so it's fine.

### Caching

URL-keyed. Same params → same URL → cached at the Vercel CDN edge for `s-maxage=86400`. Receipt/agent-card templates use `s-maxage=300` because the underlying data changes.

For v1.1 (x402-gated): caching gets trickier because we don't want to serve the cached PNG to someone who didn't pay. Solutions: short-cached paid PNGs (5 min), or signed cache tokens. Deferred to v1.1.

## Open questions (decide before build)

1. **API path**: `nexus.vdmnexus.com/api/v1/cards/[template]` — confirmed correct? Or do we want `cards.vdmnexus.com` as a subdomain (cleaner brand, separate Vercel project)?
2. **POST body shape**: do we standardise on JSON-RPC-ish (`{ method: "render", params: {...} }`) for future extensibility, or keep it flat (`{ headline, subhead, ... }`)?
3. **Authentication for receipt/agent-card**: are these fully public (anyone can render a card for any agent), or rate-limited / pubkey-gated? My read is fully public — they're branded views of already-public data.
4. **Receipt template scope**: does it cover both `/v1/inference` receipts AND playground (`vdmnexus.com/r/<id>`) receipts? Probably yes (same lookup logic exists in apps/nexus + apps/web).
5. **Free tier**: how many renders per IP per day during v1 (before x402 enforcement)? Suggest 100/day per IP for v1 — generous for humans, signals constraint for v1.1 paid mode.
6. **MCP tool**: should v2 also expose this as an MCP tool (`nexus_render_card`) so Claude Desktop / Cursor agents can call it? Probably yes; deferred to v2.

## Implementation checklist (next session)

In rough order:

- [ ] Create `apps/nexus/app/api/v1/cards/` scaffolding (route handler, `_chrome.tsx`, `_templates/`, `_lib/`)
- [ ] Extract brand chrome from the existing `apps/web/app/og/route.tsx` + `roadmap/opengraph-image.tsx` + `r/[id]/og-image.tsx` into `_chrome.tsx`
- [ ] Build `milestone` template — port from v0 `/og` route
- [ ] Build `proof` template — design the row table layout
- [ ] Build `ship` template — design with type-badge color per PR type
- [ ] Build `receipt` template — wire up to receipt lookup lib (refactor from existing `apps/nexus/app/api/v1/receipts/[lookup]/route.ts`)
- [ ] Build `agent-card` template — wire up to Supabase agent stats
- [ ] Implement PNG hashing + response header wiring (`X-Card-PngHash`, `X-Card-Template`, `X-Card-ParamsHash`)
- [ ] Add POST handler (JSON envelope response)
- [ ] Add rate limit (Upstash, per-IP, 100/day during v1)
- [ ] Add caching headers per template
- [ ] Add `apps/web/app/og/route.tsx` → 308 redirect to `nexus.vdmnexus.com/api/v1/cards/milestone?...` (preserves the URL we used today)
- [ ] Document in `apps/docs/content/docs/cards.mdx` — usage examples, template gallery, params reference
- [ ] Update `CLAUDE.md` with the new surface
- [ ] Re-render today's "Three weeks at VDM Nexus" card from the new endpoint, swap in the broadcast file, post the full ship-broadcast

Stretch (same session if time permits):
- [ ] Public template gallery at `vdmnexus.com/cards` — shows live examples of each template
- [ ] Add card-service entry to `/openapi.json` and `/.well-known/x402.json` (as a v0/free entry until v1.1 lights up payment)

Out of scope (defer to v1.1):
- x402 gating
- Signed receipts (Ed25519 over `{ template, params_hash, png_hash, payment, timestamp }`)
- Pricing wire-up

## Why this matters

The discovery-surfaces work today made the rail crawler-discoverable. This makes the rail visually shareable — every agent action can produce a hash-verified card that other agents, humans, and crawlers can embed. It's the "open graph" of the agent economy, but signed.

Concretely: when a Nexus agent ships something or hits a milestone, it doesn't post a tweet about it — it calls `/api/v1/cards/ship` with the details and gets back a branded card + a receipt proving the card represents real activity, paid for, signed. That's a primitive the agent ecosystem doesn't have today.
