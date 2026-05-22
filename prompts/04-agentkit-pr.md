# Prompt 04 — Coinbase AgentKit action provider PR

**Roadmap item:** Phase 1 — Distribution, #4.
**Branch:** `claude/agentkit-pr` (local) — the actual PR is in a fork
of `coinbase/cdp-agentkit`.
**Outcome:** Open PR against `coinbase/cdp-agentkit`.

---

## Pre-session checklist

1. Read `STATUS.md`. Add a row:
   `| claude/agentkit-pr | Coinbase AgentKit vdm-nexus action provider | <today> | in_progress | — |`
2. Read `CLAUDE.md` section "@vdm-nexus/x402" — that's what the action
   provider wraps.

## Prompt body

Goal: open a PR against `coinbase/cdp-agentkit` adding a `vdm-nexus`
action provider. Highest-visibility OSS contribution available —
forces a Coinbase team review and puts Nexus in front of every
AgentKit user.

### Tasks

1. Read `coinbase/cdp-agentkit` on GitHub. Find the
   `framework-extensions/` directory and the existing action-provider
   pattern. Use a well-reviewed extension (e.g. langchain extension)
   as the template.
2. Write the Nexus action provider in TypeScript, mirroring the
   pattern exactly:
   - Package name: follow their extension naming convention
     (probably `@coinbase/agentkit-vdm-nexus`).
   - Actions:
     - `nexusChat(messages, opts?)` → calls `/chat/completions` paid
       via x402, returns OpenAI chat completion + receipt.
     - `nexusVerifyReceipt(receipt)` → returns the 5-check
       verification result.
     - `nexusGetDepositAddress(network?)` → returns the deposit
       address on the requested network.
   - Internally uses `@vdm-nexus/x402` (regular dep, not hoisted).
   - Pulls credentials from the AgentKit-managed wallet.
3. Docs + example in their conventions. Demo: an AgentKit agent
   calling `nexusChat` and printing the receipt.
4. Open the PR:
   - Title: *"Add VDM Nexus action provider (signed inference via x402
     on Solana + Base)"*
   - Body: 3 paragraphs — what it does; link to mainnet receipt
     (`vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e`); link to
     docs. Reads technical, not marketing.

### Constraints

- Mirror the structure of an existing well-reviewed provider.
- No top-level deps added to AgentKit. `@vdm-nexus/x402` lives inside
  the new extension's `package.json`.
- PR description: technical, not marketing-y. Let the receipt speak.

### Deliverable

Open PR URL against `coinbase/cdp-agentkit`. Even if it sits in review
for weeks, the PR thread is the artifact that puts Nexus on Coinbase's
radar.

## Done criteria

1. Fork of `coinbase/cdp-agentkit` created under our org or user.
2. Branch on the fork with the action-provider code.
3. PR open against `coinbase/cdp-agentkit:main`.
4. CI green on the fork.
5. `STATUS.md` row updated to `in_review` with the upstream PR URL.
6. Build_log entry: *"Coinbase AgentKit PR open — vdm-nexus action
   provider proposed. <PR-URL>. Forces a Coinbase team review."*
   Tags: `['distribution', 'coinbase', 'agentkit']`.
7. Subscribe to the upstream PR activity. Respond to maintainer
   reviews promptly.
