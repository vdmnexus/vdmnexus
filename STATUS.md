# In-flight work

Single source of truth for what's running across parallel Claude Code
sessions. Every session updates its own row at start and end.

## Active branches

| Branch | What | Started | Status | PR |
|---|---|---|---|---|
| `claude/site-two-layer-rebuild` | Two-layer homepage story (trust + capital/Rienda), disclosures/security rewrite, token plan re-venue to Uniswap v4 on Robinhood Chain, WC26 removal | 2026-07-30 | merged | [#149](https://github.com/vdmnexus/vdmnexus/pull/149) |
| `claude/site-audit-nav-fixes` | Post-#149 site audit: route inventory, dead-link fixes, nav/footer IA for the two-layer story, playground upstream_error root cause (SDK empty-body handling + nexus rate-limit fail-open), VOICE.md + copy-lint in CI | 2026-07-31 | merged | [#150](https://github.com/vdmnexus/vdmnexus/pull/150) |
| `claude/rienda-page-loop-retarget` | Dedicated /rienda page (nav/footer retarget from /#rienda anchor), nightly planning loop retargeted to launch-readiness + Rienda M1-M5 + health checks, dead OpenRouter fast-tier slug fix | 2026-07-31 | in_review | [#151](https://github.com/vdmnexus/vdmnexus/pull/151) |

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
