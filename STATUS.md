# In-flight work

Single source of truth for what's running across parallel Claude Code
sessions. Every session updates its own row at start and end.

## Active branches

| Branch | What | Started | Status | PR |
|---|---|---|---|---|
| (none) | | | | |

#149, #150, #151 merged as of 2026-07-31; #156, #157, #158 (rebrand +
wallet connect, og:image, `/build` page) merged as of 2026-08-04;
#160 (`/live` chain reads) and #162 (trustless vault enumeration)
merged as of 2026-08-06; #163 (2026-08-06 daily review, recovered
from a stuck-unmerged state) merged 2026-08-07; #165 (2026-08-08
daily review, recovered from a stuck-unmerged state — fifth such
recovery: #142, #152, #155, #163, #165) merged 2026-08-09; #166
(2026-08-09 daily review, recovered from a stuck-unmerged state —
sixth such recovery, and the first time it happened two nights in a
row) merged 2026-08-10.

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
