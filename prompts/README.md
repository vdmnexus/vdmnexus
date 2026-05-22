# Session prompts

Canonical Claude Code session prompts for VDM Nexus roadmap work. Each
file is a self-contained briefing. Copy-paste the file body into a new
session and fire.

## Active prompts (Phase 1 — Distribution push)

| # | File | Status |
|---|---|---|
| 1 | `01-python-sdk.md` | Ready to fire |
| 2 | `02-discovery-listings.md` | Ready to fire |
| 3 | `03-erc-8004-card.md` | Ready to fire |
| 4 | `04-agentkit-pr.md` | Ready to fire |
| 5 | `05-mastra-vercel-providers.md` | Ready to fire |
| 6 | `06-compliance-one-pager.md` | Ready to fire |

## Conventions

- Every prompt opens with a pre-session checklist (read STATUS.md,
  CLAUDE.md, confirm branch).
- Every prompt closes with a done-criteria block (PR open + CI green +
  STATUS.md updated + build_log entry).
- New prompts go in this directory, numbered loosely by roadmap order.
- If a prompt needs editing, edit the file — don't paste a modified
  version into a session ad-hoc. Future you needs to know what was
  actually run.

See `../WORKFLOW.md` for the full ship discipline.
