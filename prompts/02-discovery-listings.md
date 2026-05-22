# Prompt 02 — x402 discovery listings

**Roadmap item:** Phase 1 — Distribution, #2.
**Branch:** `claude/discovery-listings`.
**Outcome:** `SUBMISSIONS.md` at repo root with 4 ready-to-submit
packets. User submits by hand.

---

## Pre-session checklist

1. Read `STATUS.md`. Add a row:
   `| claude/discovery-listings | Submission packets for 4 x402 indexes | <today> | in_progress | — |`
2. Read `CLAUDE.md` for the canonical "what's live" list and the npm
   package names.

## Prompt body

Goal: submission packets for the four x402 discovery surfaces that
index every new agent-payment service. Zero-cost distribution; pure
leverage on what's already shipped.

### Targets

1. **x402 Bazaar (Coinbase CDP)** — semantic-search index. Submission
   via `@x402/extensions/bazaar` manifest exposed by
   `/chat/completions` response.
2. **Agentic.Market (Coinbase)** — curated marketplace, 7 categories
   (reasoning / data / media / search / social / infrastructure /
   trading). Public submission form.
3. **x402.direct** — community index (~4000 services). GitHub-based
   registry.
4. **awesome-x402** — GitHub awesome-list. PR-based, likely a new
   "Signed inference" subsection.

### For each target

- Find the canonical submission process (search GitHub + their docs;
  do NOT guess URLs).
- Draft the exact text to submit: 1-sentence pitch, 1-paragraph
  what-it-is, all required metadata.
- Note the submission URL / form / PR target.

### Positioning to anchor on

> "Signed inference — AI agents pay per call in USDC on Solana mainnet
> (and Base), and get a cryptographically verifiable receipt of the
> model's response."

### Artifacts to cite in every submission

- First mainnet receipt:
  `vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e`
- Verifier: `verify.vdmnexus.com`
- Docs: `docs.vdmnexus.com`
- npm: `@vdm-nexus/sdk`, `@vdm-nexus/x402`, `@vdm-nexus/paywall`,
  `@vdm-nexus/mcp`
- Source: `github.com/vdmnexus/vdmnexus` (MIT)
- Pricing: `$0.01 USDC` flat per call

### Deliverable

A single `SUBMISSIONS.md` file at repo root with one section per
target, each containing:
- (a) Submission URL / PR target
- (b) Exact text to submit (copy-paste ready)
- (c) Required metadata
- (d) Any prerequisite (e.g. PR template, manifest file we need to host)

**Do not submit anything. Prepare the packets. The user submits by hand.**

## Done criteria

1. PR open against `main` from `claude/discovery-listings`.
2. CI green (markdown lint is enough — there's no code in this PR).
3. `STATUS.md` row updated to `in_review`.
4. Build_log entry: *"Discovery-listing packets drafted for x402 Bazaar,
   Agentic.Market, x402.direct, and awesome-x402. Pending manual
   submission."* Tags: `['distribution', 'x402']`.
5. Subscribe to PR activity.
