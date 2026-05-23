---
status: shipped
owner: engineering
phase: 1
depends_on:
  - PR #80 (silicon code-snippet workflow)
  - marketing/ship-broadcast.md (human-driven playbook, source of voice + structure)
shipped:
  agent_version: 0.1.0
  shipped_on: 2026-05-23
  invocation: pnpm broadcast-agent <PR#>
  artifacts:
    - agents/ship-broadcast/prompt.md
    - scripts/broadcast-agent.py
    - scripts/validate-broadcast-output.ts
  acceptance_run:
    pr_65_receipt: https://vdmnexus.com/r/2639c835-1dd3-47a1-84aa-4cb2e3c6ef11
    pr_66_receipt: https://vdmnexus.com/r/895d38a9-19e3-4d7d-9adc-0f352e3f0769
    skip_case_receipt: https://vdmnexus.com/r/c21e59a3-878c-452d-81da-b620d589544d
---

# Build the ship-broadcast agent (Phase 1)

> **Status: shipped 2026-05-23.** This file is the kickoff brief, kept
> for archival reference. The "What shipped" section below captures the
> drift between plan and reality. For the actual agent contract, read
> `agents/ship-broadcast/prompt.md`.

## What shipped (vs. the plan below)

- **Language:** Python orchestrator + TypeScript validator. The plan
  left it open ("TypeScript or Python — Python may be cleaner"); we
  picked Python to dogfood the `vdm-nexus` PyPI package and match
  the existing `smoke_test_*.py` pattern in the repo.
- **Invocation:** `pnpm broadcast-agent <PR#>` (and
  `pnpm broadcast-agent latest`, `pnpm broadcast-agent --commit <sha>`).
  The pnpm script wraps `python3 scripts/broadcast-agent.py`. Also
  available: `pnpm broadcast-agent:validate` for the JSON validator.
- **Model:** `anthropic/claude-sonnet-4` (overridable via `--model`).
- **Validator:** dropped the strict `char_count == len(text)` check
  after the first mainnet smoke. The model can miscount by a few
  chars. The validator hard-fails only on `len(text) > platform_limit`;
  the orchestrator displays the true length in the draft file.
- **VHS invocation:** the orchestrator invokes `vhs <tape>` with
  `cwd=REPO_ROOT` (not via `make -C marketing/media`). The existing
  tape files declare repo-root-relative `Output` paths — invoking
  through the Makefile produced a nested `marketing/media/marketing/media/out/`
  directory. Pre-existing bug in the tape/Makefile contract; the
  orchestrator works around it but does not "fix" the tapes.
- **PR shape:** unchanged. One PR, no self-broadcast. Recursion stops
  here in Phase 1.

## Acceptance run — 2026-05-23

All three cases executed on Solana mainnet against the live rail at
`nexus.vdmnexus.com`, using `TEST_AGENT_PUBKEY=BSKq2XtBCXHGZKvP9KStjJdpimTAJbmRP7FqZ1SBTshR`.
Total settlement: ~0.03 USDC across three calls.

| Case | Receipt | Visual | Outcome |
| --- | --- | --- | --- |
| PR #65 (Python SDK ship) | [`r/2639c835`](https://vdmnexus.com/r/2639c835-1dd3-47a1-84aa-4cb2e3c6ef11) | `vhs:langchain-chat-nexus` → GIF | Draft written, 4/4 platforms |
| PR #66 (Python SDK x402 fix) | [`r/895d38a9`](https://vdmnexus.com/r/895d38a9-19e3-4d7d-9adc-0f352e3f0769) | `silicon` → PNG | Draft written, 4/4 platforms |
| `c91c94f` (CLAUDE.md trim) | [`r/c21e59a3`](https://vdmnexus.com/r/c21e59a3-878c-452d-81da-b620d589544d) | `skip` | `ship_worthy: false`, no draft |

The drafts live at
`marketing/broadcasts/65-feat-python-vdm-nexus-sdk-python-v0-2-0.md`
and `marketing/broadcasts/66-fix-python-v2-paymentpayload-shape-compu.md` —
checked in as evidence + reference voice samples.

## Phase 2 (not yet built)

- Cron / GitHub Action that auto-triggers the agent on PR merge.
- Webhook trigger for open-PR draft (post-merge is the safer default).
- A small post-broadcast feedback loop: after the human approves /
  edits / kills a platform, fold the edit into a per-platform
  voice-tuning prompt addendum.

---

# Original kickoff brief

> **How to use this file:** open a fresh Claude Code session at the repo
> root and run `cat docs/plans/ship-broadcast-agent-phase1.md` — or paste
> the contents into the first message. The session has no memory of the
> conversation that produced this file. Everything it needs is below.

## Goal

Ship a working broadcast agent that drafts X / Farcaster / Telegram /
LinkedIn posts for any merged PR, using Nexus's own `payAndInfer` to
make the LLM call — proving the rail eats its own dog food, *and*
removing the human-as-LLM bottleneck from `/ship-broadcast`. The
existing human-driven playbook at `marketing/ship-broadcast.md` is the
voice + structure source of truth; the agent mirrors that playbook in
machine form. Phase 1 ends when a `pnpm broadcast-agent <PR#>` command
produces a reviewed draft file at `marketing/broadcasts/<pr#>-…md` with
a rendered visual attached, ready for the human approval gate.

**Out of scope for Phase 1:** cron / webhook auto-trigger, multi-agent
orchestration, anything that bypasses the human approval gate.

## Context — read these first

Before writing any code, read these files end-to-end:

1. `CLAUDE.md` — the project canon. Locked vocabulary, what's built vs.
   not built, MiCA red lines, conventions.
2. `marketing/ship-broadcast.md` — the human-driven playbook. The
   agent's job is to do this in machine form. Voice, vocabulary,
   per-platform constraints, hard rules — all locked there.
3. `marketing/media/README.md` — the visual-companion menu (VHS tapes,
   Remotion reels, silicon code-snippet PNGs, ray.so fallback). The
   agent picks which to use.
4. `marketing/media/Makefile` — `code-snippet`, `code-snippet-paste`,
   `python-sdk-x402`, `verify-receipt`, `langchain-chat-nexus`,
   `reel-weekly`, `logo-intro` targets. The agent's orchestrator calls
   these.
5. `apps/nexus/lib/receipts.ts` — receipt-signing canonical impl.
6. `packages/sdk-python/` — the Python `Agent.payAndInfer` we
   ship. The agent itself will use this client (eat-our-own-dog-food).
7. `marketing/broadcasts/*` — prior broadcast drafts. Few-shot examples
   for voice. If thin, pull `gh pr view <recent-merged-PR>` output as
   additional shape reference.

If anything in this kickoff conflicts with CLAUDE.md, **CLAUDE.md
wins.** This file is a derivative; CLAUDE.md is the canon.

## What to build

Three artifacts. Pick the language each is in based on what's natural
— prompt is markdown, the orchestrator can be TypeScript (`apps/`
convention) or Python (since we're using `vdm-nexus` PyPI package as
the LLM client — that may be cleaner).

### 1. `agents/ship-broadcast/prompt.md`

The system prompt the agent loads on every call. Top-level structure
(see the human playbook for the corresponding human-readable
sections):

```
---
agent: ship-broadcast
version: 0.1.0
owner: marketing
review_required_on_change: founder
---

# Identity
[One paragraph: who you are, why you exist, the "first agent on Nexus
paying its own way per call" framing.]

# Context
- Today is {{CURRENT_DATE}}.
- VDM Nexus is live on Solana mainnet + Base mainnet since 2026-05-21.
- The product you are broadcasting for is "signed inference" — never
  "verifiable inference", never "proof of inference", never "AI receipts".

# Locked vocabulary
[USE list + NEVER-USE list. Mirror CLAUDE.md "Strategic stance" +
"Vocabulary (locked)" + marketing/ship-broadcast.md "Voice" +
"Vocabulary (locked)". Include the X @-handle rule: only
@-mention orgs/people we have a real working relationship with —
never speculatively tag @coinbase, @base, @solana, @anthropic, etc.]

# Currently shipped — refreshed every call
Published packages: {{SHIPPED_PACKAGES_LIST}}
Framework adapters available: {{SHIPPED_ADAPTERS_LIST}}
Available VHS tapes: {{AVAILABLE_VHS_TAPES}}

You may ONLY reference products/adapters/demos that appear in these
lists. If a ship sounds like it needs something not in these lists,
that's a signal to skip (return `{ "skip": true, "reason": "…" }`)
rather than fabricate.

# 10 hard guardrails
1. Never auto-claim functionality not in CLAUDE.md → Built.
2. Never mention the token, tokenomics, $NEXUS, points, airdrop, or
   any economic-layer detail. Token posts go through a separate
   double-confirmation workflow — never draft one here.
3. Never trash-talk competitors. Don't name OpenRouter, Skyfire,
   Coinbase x402, Inference Labs, etc. by name with negative framing.
4. Never promise framework adapters not in {{SHIPPED_ADAPTERS_LIST}}.
5. Never use superlatives ("revolutionary", "industry-leading",
   "world's first"). The CLAUDE.md banned list applies in full.
6. Never use degen vocabulary ("WAGMI", "ser", "gm", "moon",
   "based") — wrong audience.
7. Never name a specific blockchain network outside the locked terms
   "Solana mainnet" / "Base mainnet". Lowercase "mainnet" as a suffix.
8. Never reference ERC-8004 as if it's shipped — it's roadmap item 3.
9. Never use plural "we" voice for solo-founder facts. The founder
   ships; "I shipped" or third-person "Nexus shipped" both fine.
10. Never schedule, send, or otherwise commit a post. Your output is
    drafts only — a human reviews before anything goes live.

# Voice reference
[Mirror the /team page register. Stylistic moves spelled out: lead
with the outcome, never the protocol; one-line hooks; no emojis;
concrete > aspirational; founder-led building-in-public.]

# Ship-worthy criteria
[YES / NO list — what merits a broadcast and what doesn't.
Default YES on `feat:`, `fix:` that unblocks a user-facing path,
material `docs:`. Default NO on typo fixes, silent refactors,
`infra` / `chore` unless it unlocks something user-visible. Per
marketing/ship-broadcast.md "Templates by ship type".]

# Per-platform constraints
[Pull table verbatim from marketing/ship-broadcast.md. X 280
(target 250-270), Farcaster 320, Telegram 4096 (target 400-700),
LinkedIn 3000 (target 1000-1400).]

# Visual selection
You pick the visual that ships with the broadcast. One of:

| Source | When to pick |
|---|---|
| `vhs:<tape-name>` | The ship's surface matches an existing tape in {{AVAILABLE_VHS_TAPES}}. |
| `silicon` | The ship's news IS a code shape (new SDK fn, install line, API signature, config snippet). Pick a 6-12 line snippet from the PR's changed files. |
| `screen-studio` | UI / browser demo with motion that has no existing tape. The orchestrator will flag this for the operator to record. |
| `remotion-reel` | Weekly summary or multi-PR ship. |
| `skip` | The ship is text-shape (docs spec, vocabulary lock, external link). |

Brand presets are locked in `marketing/media/Makefile`. You only
specify the source + the inputs (file path, language, slug). Never
specify theme, font, padding, or shadow.

# Output schema (strict JSON, no commentary)
{
  "ship_worthy": boolean,
  "skip_reason": string | null,
  "x":         { "text": string, "char_count": number } | null,
  "farcaster": { "text": string, "char_count": number } | null,
  "telegram":  { "text": string, "char_count": number } | null,
  "linkedin":  { "text": string, "char_count": number } | null,
  "visual": {
    "source": "vhs:<name>" | "silicon" | "screen-studio" | "remotion-reel" | "skip",
    "file": string | null,
    "lang": string | null,
    "slug": string | null,
    "rationale": string
  },
  "self_check": {
    "vocabulary_ok": boolean,
    "no_unshipped_claims": boolean,
    "char_counts_accurate": boolean,
    "platforms_drafted": number
  }
}

# Self-validation checklist
Before responding, verify every field of `self_check`:
- vocabulary_ok: ran every draft through USE / NEVER-USE lists
- no_unshipped_claims: every product/adapter/demo named is in the
  current-shipped lists
- char_counts_accurate: counted bytes including the literal link URL,
  not the post-shorten 23-char approximation
- platforms_drafted: matches the count of non-null platform fields

If any self_check value is false, fix the drafts before returning.

# Few-shot examples
[One example: ship-worthy feat: PR with full JSON output.
One example: skip case (a `docs:` typo fix) with ship_worthy:false
and skip_reason populated.]
```

The three placeholders (`{{CURRENT_DATE}}`, `{{SHIPPED_PACKAGES_LIST}}`,
`{{SHIPPED_ADAPTERS_LIST}}`, `{{AVAILABLE_VHS_TAPES}}`) are filled by
the orchestrator at runtime — they prevent the LLM from fabricating
ships and visuals.

### 2. Orchestrator — `apps/broadcast-agent/` (new app) OR `scripts/broadcast-agent.py`

The orchestrator's job: take a PR number, do everything between
"resolve the PR" and "draft file on disk + PNG rendered". Pseudocode:

```
1. Parse args:  broadcast-agent <PR#>
2. Resolve PR via gh pr view --json …
3. Refresh placeholder values:
   - CURRENT_DATE = today
   - SHIPPED_PACKAGES_LIST = scrape npm + PyPI for vdm-nexus packages
     (cache 1h; on miss fall back to the static list in CLAUDE.md)
   - SHIPPED_ADAPTERS_LIST = derived from packages
   - AVAILABLE_VHS_TAPES = ls marketing/media/vhs/*.tape | xargs -n1 basename -s .tape
4. Load agents/ship-broadcast/prompt.md, do verbatim substitution
   of placeholders.
5. Build user message: PR title, body, changed files summary, diff
   summary (skip if diff > 50 KB; agent works from title + body in
   that case).
6. Call payAndInfer with the loaded system prompt + the user
   message. Pin model to something with strong instruction-following
   for JSON output (Claude Sonnet via OpenRouter is a sensible
   default — but verify the receipt comes back valid SIR v2 either way).
7. Parse the returned JSON. Validate against the schema above; if
   invalid, surface to operator (don't auto-retry — JSON shape
   failures probably mean prompt drift).
8. Render the visual:
   - vhs:<tape> → `make -C marketing/media <tape>`
   - silicon    → `make -C marketing/media code-snippet FILE=… SLUG=… LANG=…`
   - others     → emit a TODO in the draft footer asking the
                  operator to do it
9. Write marketing/broadcasts/<pr#>-<slug>.md mirroring the existing
   convention in marketing/ship-broadcast.md "Draft file convention".
   Include the agent version (read from prompt.md frontmatter) and
   the Nexus receipt ID in the footer for traceability.
10. Print a one-line summary: PR #, draft file path, visual path,
    receipt ID. Exit.
```

**Critical: never auto-schedule.** The orchestrator writes the draft
to disk and exits. The human runs `/ship-broadcast <PR#>` (or
whatever invocation they prefer) to review and schedule.

### 3. `docs/plans/ship-broadcast-agent-phase1.md`

You're reading it. Update it with what you actually shipped — file
paths, command shapes, anything that drifted from this plan. Future
phases (cron trigger, webhook trigger, multi-agent orchestration)
get their own files: `phase2.md`, etc.

## Locked behaviors

These are non-negotiable and ride above any judgment call you might make:

1. **Human approval gate stays.** No scheduling, no sending,
   no Postiz call. The orchestrator exits at draft-on-disk.
2. **Visual brand presets locked.** Theme `OneHalfDark`, font
   `JetBrains Mono` 20pt, bg `#080810`, padding 80 — these live in
   `marketing/media/Makefile` and the agent only specifies inputs,
   never overrides.
3. **Receipt every call.** The agent uses `payAndInfer`, not a raw
   OpenRouter call. Every broadcast draft footer references the
   Nexus receipt ID. Eat your own dog food.
4. **Strict JSON output.** No "thinking out loud" before the JSON,
   no markdown fence, no commentary. If the model wants to reason,
   that goes inside a JSON field, not outside.
5. **Fail closed, not open.** If placeholder refresh fails, fall
   back to CLAUDE.md static lists. If the model returns invalid
   JSON, write the raw output to a `<pr#>-DRAFT-FAILED.md` file
   and exit non-zero — do not silently retry.

## Acceptance criteria

Phase 1 is shippable when all of these pass:

- [ ] `pnpm broadcast-agent 65` (or whatever invocation you settle on)
      against PR #65 (Python SDK ship) produces a draft file at
      `marketing/broadcasts/65-python-sdk.md` with X / Farcaster /
      Telegram / LinkedIn populated and a `marketing/media/out/65-*.png`
      rendered via silicon.
- [ ] The same against PR #66 (Python SDK x402 fix) skips LinkedIn
      (rationale in the footer: "narrow fix, B2C audience not the
      buyer") OR drafts it — whichever the model picks is fine, but
      the JSON `visual.rationale` field must explain the decision.
- [ ] The same against a docs-typo commit returns `ship_worthy: false`
      with a populated `skip_reason`, and writes nothing to disk
      except a one-line stderr log.
- [ ] Output JSON validates against the schema documented in the
      prompt — write a `scripts/validate-broadcast-output.ts` so
      this is testable in CI.
- [ ] The agent's payAndInfer call settles a real on-chain payment;
      the receipt ID appears in the draft footer.
- [ ] All locked guardrails enforced — verified by inspection on the
      three PRs above. No token language, no superlatives, no
      ERC-8004 claims, no plural-we for solo facts.
- [ ] CLAUDE.md updated under "Built" to reference the agent.
- [ ] No changes to `marketing/ship-broadcast.md`'s human-driven
      flow — the agent supplements, it does not replace. Both flows
      should coexist.

## Non-goals (Phase 1)

Explicitly do NOT build any of these:

- Cron / webhook / GitHub Action that auto-triggers the agent on
  PR-merge. (Phase 2.)
- A web UI for browsing broadcasts. (`apps/web/admin/broadcasts`
  already exists per CLAUDE.md.)
- Multi-agent orchestration, chains, or planning loops. One LLM
  call per broadcast, full stop.
- A new `payAndInfer` model selector. Use whatever the existing
  SDK defaults to.
- A separate facilitator for the agent's payments. Use the same
  in-process facilitator the rest of the rail uses. (MiCA red
  line — never expose the facilitator to third parties.)
- Token / economic-layer language. Not now, not ever in this agent.

## PR shape

When done, open ONE pull request titled:

```
feat(agents): ship-broadcast agent Phase 1 — first agent on Nexus
```

Body should include:

- Summary (2-3 bullets)
- One screenshot of a generated draft file
- One receipt permalink (`vdmnexus.com/r/<id>`) from a real test
  call the agent made during smoke testing
- Test plan (the acceptance-criteria checklist above)

Co-author the commit with Claude per repo convention. Don't push to
`main` or schedule a broadcast about the agent until the founder
has reviewed and merged. (Yes — the agent's own launch broadcast is
human-drafted. Recursion stops here in Phase 1.)

## When you get stuck

- Voice questions → re-read `marketing/ship-broadcast.md` "Voice"
  section. If still unclear, the answer is "ask the founder, don't
  guess" — leave a `// TODO: founder-review` and move on.
- Schema questions → the prompt's `Output schema` block is the
  contract. If you change it, update the validator and any
  downstream consumer in the same commit.
- Visual-selection edge cases → mirror what
  `marketing/ship-broadcast.md` Step 3.5 does for human-driven
  flow. If a case isn't covered there, default to `skip` and add a
  follow-up task.
- Anything that requires a real on-chain test → the test wallets are
  documented in CLAUDE.md under "Test wallets". Use the devnet
  wallet for everything except the final acceptance smoke test.
