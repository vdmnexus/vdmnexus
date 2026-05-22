# Ship broadcast — playbook + workflow

Every shipped PR worth surfacing → four posts (X, Farcaster, Telegram, LinkedIn) → scheduled via Postiz. This file is the source of truth: voice, vocabulary, templates, hard rules, and the step-by-step workflow Claude follows when the user invokes `/ship-broadcast`.

## Workflow

When the user types `/ship-broadcast`, follow these steps. The trigger phrases that should route here: `/ship-broadcast`, "broadcast the ship", "tweet about <PR>", "post about <ship>", "announce <PR>", or any explicit request to broadcast a merged/open PR.

### 1. Identify the ship

User invokes one of:
- `/ship-broadcast <PR#>` — that specific PR
- `/ship-broadcast latest` (or no arg) — the most recent open or merged PR by `git log` / `gh pr list`
- `/ship-broadcast --commit <sha>` — broadcast a commit instead of a PR (rare; use when no PR exists)

Resolve to a concrete PR or commit. Pull title, body, and changed-files summary:

```bash
gh pr view <num> --json number,title,body,url,mergedAt,state,headRefName,files
```

If state is `OPEN` and CI isn't green, warn the user before drafting — broadcasting a failing-CI PR is a foot-gun.

### 2. Classify

Use the PR title prefix (`feat:` / `fix:` / `chore(outreach):` / `chore(distribution):` / `docs:` / `infra:` / `refactor:`) to pick a bucket below. When ambiguous, ask.

### 3. Draft

Generate four drafts in this order, respecting platform constraints from the table below:

1. **X (Twitter)** — 280 chars, link counts as 23. Hook → context → CTA.
2. **Farcaster** — 320 chars. Crypto-native, can lean technical. Link the receipt or docs.
3. **Telegram** — Markdown OK, 400-700 chars target. Channel-announcement style.
4. **LinkedIn** — 1000-1400 chars optimal, professional. Lead with the buyer-relevant outcome, not the protocol detail.

Write the drafts to `marketing/broadcasts/<pr#>-<short-slug>.md` (one file per ship, contains all four channels — see the "Draft file convention" section below). This is the review artifact.

### 3.5. Visual companion

Text-only posts get half the engagement of posts with a visual. Before the review gate, pick the visual that will ride with the broadcast. Three sources, in priority order:

1. **Existing VHS tape** — `marketing/media/vhs/<demo>.tape`. If the ship's surface is one of: Python SDK x402 handshake, receipt verification, ChatNexus / LangGraph node — there's already a tape. Render it locally:
   ```bash
   make -C marketing/media <target>      # e.g. python-sdk-x402
   ```
   The output GIF lands at `marketing/media/out/<slug>.gif`. Reference it in the draft file footer so the user knows what to attach in the X composer / Telegram channel / LinkedIn post. See [`media/README.md`](media/README.md) for the full menu.

2. **Ad-hoc Screen Studio recording** — when the ship doesn't fit any existing tape (e.g. a new admin UI, a one-off browser demo). Ask the user to drop the file in `marketing/media/out/` (gitignored) and reference it the same way. Don't fake the recording; a missing visual is better than a wrong one.

3. **Remotion ship reel** — for weekly-roundup posts or multi-PR ships, render `WeeklyShipsReel` (`make -C marketing/media reel-weekly`) after editing `marketing/media/remotion/src/ships.json` to include the PRs in scope. Output lands as `marketing/media/out/weekly-ships-reel.mp4`.

4. **Skip** — if the ship is text-shaped (docs spec, a vocabulary lock, an external link) and a visual would feel forced, say so in the draft footer ("no visual; pure text post"). Don't fabricate.

Per-platform notes for attachments:

- **X**: GIF or MP4 ≤512 MB. GIFs autoplay muted; MP4s preferred for >30s. Aspect 16:9 (the tapes are 1280×720) is X-native.
- **Farcaster**: a single image / GIF / video URL. Receipt permalinks (`vdmnexus.com/r/<id>`) already render as a card; sometimes that's the best visual.
- **Telegram**: native video, GIF, or animated MPEG-4 — all autoplay in the channel. Long-form (45s+) is fine here.
- **LinkedIn**: 16:9 or 1:1, MP4 ≤10 min. Native video posts beat YouTube embeds.

After picking the visual, write the path into the draft file footer under a `## Visual` section so review can confirm at a glance:

```markdown
## Visual

- File: `marketing/media/out/python-sdk-x402.gif`
- Source: `vhs/python-sdk-x402.tape` rendered 2026-05-22
- Use for: X, Farcaster, Telegram
- Skip for: LinkedIn (use ship-reel MP4 instead)
```

### 4. Review gate

Show the drafts inline in chat, with character counts:

```
X (262/280):        ...
Farcaster (310/320): ...
Telegram (574 chars): ...
LinkedIn (1,247 chars): ...
```

Ask the user to approve, edit, or skip per-platform. Accept partial approval — they may want X + Telegram only and skip LinkedIn. **Never auto-send.**

### 5. Schedule

Ask scheduling preference. Default options:
- **Now** — publish immediately
- **+30m / +1h / +4h** — buffer for the user to catch typos after scheduling
- **Specific time** — user provides ISO 8601 or natural language ("tomorrow 9am CET")

**Posting mechanism — check what's wired up before promising end-to-end:**

1. **Postiz CLI (end-to-end)** — only when `which postiz` returns a path AND `$POSTIZ_API_KEY` is set in the shell. Both conditions. If both true, invoke the `postiz:postiz` skill once per approved platform, capture post IDs into the draft file footer.
2. **X intent URL (no-setup fallback for X)** — when Postiz isn't wired up, build a `https://x.com/intent/tweet?text=<url-encoded>` link. User clicks once, X compose modal opens with the tweet pre-filled, they hit **Schedule** → set time → done. Surface this as the default no-friction path. Include both the URL and the raw text in the chat output so they can also copy-paste if the link's awkward.
3. **Manual paste (everything else)** — for Farcaster / Telegram / LinkedIn when Postiz isn't wired up, leave the draft file in place and tell the user to paste into the platform's native composer.

The "Postiz CLI is in the skill registry" check is *not* enough — the skill file being available doesn't mean the runtime is installed. Always verify with `which postiz` + `$POSTIZ_API_KEY` first. Skipping this leads to false-promise behavior the user will rightly be annoyed by.

After scheduling (or handing off), update the draft file footer with the mechanism used and any post IDs / intent URLs.

If the user picks "later, I'll do it" — leave the draft file in place and exit. It's reusable.

### 6. Confirm

After all approved platforms are scheduled, print one summary line per scheduled post with the Postiz dashboard URL or post ID. Update `marketing/broadcasts/<pr#>-<short-slug>.md` with a footer listing scheduled times and IDs.

### Edge cases

- **No PR yet, just a commit** — use the commit's first-line subject as the title; same workflow.
- **PR is a docs-typo fix and isn't user-visible** — recommend skipping. Ask first.
- **Multiple ships in one day** — max 1 X post per 4 hours unless the second is materially different. Stagger schedules.
- **Empty / thin PR description** — read the diff (`gh pr diff <num>`) and write the post from the diff. Don't fabricate.
- **User pastes their own draft** — skip drafting, run their copy through the per-platform rewriter (chars + tone), go straight to review + schedule.
- **Postiz is down or unauthorized** — fail gracefully, save drafts to `marketing/broadcasts/`, tell the user to schedule by hand.

### When NOT to use this workflow

- Casual replies to community questions — manual.
- Telegram DMs to specific contacts — Postiz is for broadcast channels only.
- Token / financial-action posts — never auto-schedule anything that could move price. Always require explicit double-confirmation, and surface the MiCA red-line warning from `CLAUDE.md`.

---

## Voice

- **Founder-led, building-in-public.** Small team shipping. "We shipped X" / "X is live" — not "We are pleased to announce".
- **Concrete, never aspirational.** Describe what works *today*. If a thing is "coming soon," don't broadcast it.
- **Lead with the outcome, not the protocol.** "Your agent now pays per call on Solana" beats "We implemented x402 v2 on `/chat/completions`."
- **No emojis** in drafts. The user can add them in review if they want them. (Crypto Twitter loves them; LinkedIn hates them; safer to default off.)
- **No corporate marketing-speak.** Banned: "revolutionary", "next-generation", "industry-leading", "synergy", "unlocking", "empowering".

## Vocabulary (locked)

- The product is **signed inference**. Use it as the noun in every X/Farcaster/Telegram post where the concept comes up.
- **Avoid**: "verifiable inference" (claimed by Inference Labs / ZKML), "proof of inference" (crypto-jargon-heavy), "AI receipts" (vague).
- **Receipts** are "SIR v2" or "signed inference receipts" — capitalized "SIR" only when calling out the spec by name.
- **The rail** is "the agent payment rail" — covers x402, deposits, ledger.
- **Networks**: "Solana mainnet", "Base mainnet" — lowercase "mainnet" when it's a suffix.
- **Verifier**: `verify.vdmnexus.com`, not "the verifier".

## Hard rules

- **Always link to a Nexus domain**, never the GitHub PR. Audience is product users, not contributors.
  - Default landing: `vdmnexus.com`
  - Docs: `docs.vdmnexus.com`
  - Receipt permalink (when a ship demonstrates a real call): `vdmnexus.com/r/<id>`
  - Verifier (when the ship adds a verification surface): `verify.vdmnexus.com`
- **Don't claim functionality that isn't in CLAUDE.md → Built.** If in doubt, grep `CLAUDE.md`. Banned aspirational phrases (until they ship): "fully audited", "MiCA-compliant", "production-ready" (use "live on mainnet" instead), "no rate limits", "free forever".
- **Active EU marketing is reverse-solicitation-safe only.** No paid EU campaigns, no "open for EU customers" wording. Until the Spanish firm MiCA memo is filed (roadmap item 11), broadcasts are founder-led organic only — fine for X/Farcaster/Telegram, careful on LinkedIn (no "we serve regulated entities in EU" claims).
- **Cadence**: max 1 X post per 4 hours unless materially different. Don't broadcast docs typos or refactors. Don't broadcast `infra` or `chore` PRs unless they unlock something user-visible.
- **Token / financial actions**: never auto-schedule. Always require explicit user double-confirmation, and surface the MiCA red-line section from CLAUDE.md.

## Per-platform constraints

| Platform | Char limit | Target | Voice | Link policy |
|---|---|---|---|---|
| X (Twitter) | 280 (links = 23) | 250-270 | hook → context → CTA | one link, end of post |
| Farcaster | 320 | 280-310 | crypto-native, technical OK | one link OK; receipt permalinks land especially well |
| Telegram | 4096 | 400-700 | channel-announcement | markdown allowed; 1-3 links fine |
| LinkedIn | 3000 | 1000-1400 | professional, buyer-relevant | one link, paragraph break before it |

Character counting: use the raw post including the link's literal characters. Postiz/X will shorten links to ~23 chars at post time, but draft to the raw length for safety.

## Templates by ship type

PR title prefixes (per repo convention) → bucket. When ambiguous, ask.

### Feature (`feat:`)

A new product surface. The highest-leverage broadcast type — these are most of what the audience cares about. Examples: PR #65 Python SDK, hypothetical "Base mainnet live" ship.

**X**
```
{one-line outcome that's user-visible}.

{one-line "what this unlocks" — concrete, not aspirational}.

{vdmnexus.com link to the most relevant landing}
```

Example for PR #65:
```
@vdm-nexus/sdk-python is live on PyPI.

Python agents now get the same signed-inference rail as the TS SDK — Ed25519 keypair auth, x402 per-call pay, SIR v2 receipts. langchain-vdm-nexus drops in as a ChatModel.

docs.vdmnexus.com
```

**Farcaster** — same hook as X, plus a second sentence on the protocol nuance Farcaster will care about. Link the receipt permalink when applicable.

**Telegram**
```
**{Headline — 6-10 words}**

{Paragraph 1: what shipped and what it means for users}

{Paragraph 2: how to try it — npm/pip install command, or one-liner curl}

{Link to docs}
```

**LinkedIn**
```
{Hook sentence — what changed for the audience, in business terms}

{Paragraph 2: the problem this solves — frame around audit trails, agent autonomy, compliance evidence, depending on the feature}

{Paragraph 3: concrete capability — what's now possible that wasn't yesterday}

{Paragraph 4: how to engage — link to docs or the verifier, not the PR}
```

### Fix (`fix:`)

Broadcast only when the fix unblocks a user-facing path (e.g. PR #66 — the x402 handshake was failing for Python users). Skip silent fixes.

**X**
```
Fixed: {one-line description of what was broken from the user's POV}.

{One-line "it now works" with a concrete callable}.

{vdmnexus.com link}
```

**Telegram / LinkedIn** — emphasize *what works now*, not the bug. Audience cares about capability restored, not regrets.

### Distribution (`chore(outreach):` / `chore(distribution):`)

Outreach packets ready for upstream PRs (Coinbase AgentKit, SendAI, x402 discovery surfaces). These ship as "we're now in ecosystem X" *only after the upstream PR is merged* — the packet itself is internal infra.

**Do not broadcast** the packet PR (e.g. PR #62, #63, #67) when it merges into vdmnexus repo. Broadcast when the *upstream* PR merges, with language like:

```
@vdm-nexus is now a drop-in action provider in @coinbase AgentKit. Every AgentKit user gets signed-inference receipts on their LLM calls with zero config.

{link to coinbase docs or the merged PR in their repo}
```

This is the only case where the link can be off-domain — upstream ecosystem PRs are the news.

### Docs (`docs:`)

Broadcast only material docs: a new spec, a major guide, the SIR v2 published. Skip typo fixes, link sweeps, README polish.

**X**
```
{What the doc is, one line}.

{Why it matters in one line}.

{docs.vdmnexus.com link}
```

### Infra / chore / refactor

Default: **don't broadcast**. Ask the user before drafting. Exceptions:
- Cost / performance: "Routes now stream over Edge with p99 < 200ms" — that's user-visible.
- Operational: kill switch added, allowlist mode, KMS-backed signing — surface to operator audience on LinkedIn only.

## Tag conventions

X / Farcaster — no hashtags unless the user explicitly wants them. They clutter and don't help reach on X anymore. Mentions are fine when relevant (`@coinbase`, `@base`, `@solana`).

Telegram — no tags. Channels are subscribed-to, not searched.

LinkedIn — 3-5 tags max, at the end. Useful ones for our audience: `#AIAgents` `#Solana` `#x402` `#AgentInfrastructure` `#OnChainAI`.

## Draft file convention

Each broadcast lives at `marketing/broadcasts/<pr#>-<short-slug>.md` while in review, with this shape:

```markdown
# Broadcast — PR #66 — Python SDK x402 v2 fix

**Type**: fix
**Linked PR**: https://github.com/vdmnexus/vdmnexus/pull/66
**Drafted**: 2026-05-22 by Claude / Dennis

---

## X (262/280)
{draft}

## Farcaster (305/320)
{draft}

## Telegram (574 chars)
{draft}

## LinkedIn (1,247 chars)
{draft}

---

## Schedule

| Platform | Status | Scheduled for | Postiz ID |
|---|---|---|---|
| X | scheduled | 2026-05-22 20:30 CET | post_abc123 |
| Farcaster | scheduled | 2026-05-22 20:30 CET | post_def456 |
| Telegram | skipped | — | — |
| LinkedIn | skipped | — | — |
```

Append a `## Visual` section (see Step 3.5) when a render exists:

```markdown
## Visual

| File | Source | Use for |
|---|---|---|
| `marketing/media/out/python-sdk-x402.gif` | `vhs/python-sdk-x402.tape` (2026-05-22) | X, Farcaster, Telegram |
| `marketing/media/out/weekly-ships-reel.mp4` | Remotion `WeeklyShipsReel` (2026-05-22) | LinkedIn |
```

These files are checked in. They're useful for: (a) auditing what was said when, (b) future Claude sessions learning the voice from real examples, (c) reusing language across related ships.

## Useful prior art (real ship examples)

Once the first few broadcasts land, drop links to the best ones here so the skill can use them as few-shot examples:

- _(empty — fill in as we ship)_

## Postiz setup notes

- Channel: `@vdmnexus` on X (founder account)
- Channel: vdmnexus Telegram broadcast channel
- Channel: `@vdmnexus.eth` on Farcaster (or whatever the actual handle is — update on first run)
- Channel: VDM Nexus LinkedIn company page

If Postiz is missing any of these, the skill should fail gracefully on that platform and tell the user to connect it in the Postiz UI.
