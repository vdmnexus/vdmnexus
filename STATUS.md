# In-flight work

Single source of truth for what's running across parallel Claude Code
sessions. Every session updates its own row at start and end.

## Active branches

| Branch | What | Started | Status | PR |
|---|---|---|---|---|
| `claude/discovery-listings` | x402 discovery submission packets (`SUBMISSIONS.md`) | 2026-05-22 | in_review | [#63](https://github.com/vdmnexus/vdmnexus/pull/63) |
| `claude/clarify-npm-status` | CLAUDE.md npm/PyPI publish state update | 2026-05-22 | in_review | [#64](https://github.com/vdmnexus/vdmnexus/pull/64) |
| `claude/langchain-adapter` | Python SDK v0.2 (x402) + langchain-vdm-nexus | 2026-05-22 | in_review | [#65](https://github.com/vdmnexus/vdmnexus/pull/65) |
| `claude/fix-langchain-x402-v2-shape` | Python SDK x402 v2 PaymentPayload shape + compute-budget + memo fix (PR #65 follow-up) | 2026-05-22 | in_review | [#66](https://github.com/vdmnexus/vdmnexus/pull/66) |
| `claude/sendai-plugin` | Drop-in `@solana-agent-kit/plugin-vdm-nexus` for SendAI upstream submission | 2026-05-22 | in_review | [#67](https://github.com/vdmnexus/vdmnexus/pull/67) |
| `claude/ship-broadcast-skill` | `/ship-broadcast` workflow — drafts X/Telegram/Farcaster/LinkedIn posts per ship, schedules via Postiz | 2026-05-22 | in_review | [#68](https://github.com/vdmnexus/vdmnexus/pull/68) |
| `claude/marketing-video-pipeline` | VHS terminal-demo pipeline + Remotion ship-reels scaffold + `/ship-broadcast` visual companion step | 2026-05-22 | in_review | [#71](https://github.com/vdmnexus/vdmnexus/pull/71) |

## Conventions

- One session = one branch = one PR. Never two sessions on the same branch.
- Branch name pattern: `claude/<short-kebab-name>`.
- Status values: `in_progress`, `in_review` (PR open, CI green, ready for merge),
  `merged`, `paused`, `blocked`, `abandoned`.
- Update the row when the PR opens and when it merges. Delete the row
  once merged + the build_log entry is in.
- If a branch is paused, write a one-line note in the row about *why*
  and what unblocks it.

## Cap on parallel work

**Max 3 active branches.** More than that and review quality drops below
the productivity gain. If you'd be the 4th, wait for one to merge first.
