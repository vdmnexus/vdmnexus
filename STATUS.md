# In-flight work

Single source of truth for what's running across parallel Claude Code
sessions. Every session updates its own row at start and end.

## Active branches

| Branch | What | Started | Status | PR |
|---|---|---|---|---|
| `claude/discovery-listings` | x402 discovery submission packets (`SUBMISSIONS.md`) | 2026-05-22 | in_review | [#63](https://github.com/vdmnexus/vdmnexus/pull/63) |
| `claude/clarify-npm-status` | CLAUDE.md npm/PyPI publish state update | 2026-05-22 | in_review | [#64](https://github.com/vdmnexus/vdmnexus/pull/64) |
| `claude/langchain-adapter` | Python SDK v0.2 (x402) + langchain-vdm-nexus | 2026-05-22 | in_review | [#65](https://github.com/vdmnexus/vdmnexus/pull/65) |

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
