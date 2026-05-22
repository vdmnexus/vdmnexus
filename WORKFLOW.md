# How we ship

This is the discipline that keeps parallel Claude Code sessions from
turning into a context-switching mess. Read this once. Then live it.

## The loop

```
prompt → session → branch → PR → review → merge → roadmap + build_log update
```

Every arrow is a checkpoint. You can pause at any of them without losing
state.

## Rules

1. **The PR is the artifact.** A session is "done" when the PR is open,
   not when the work feels finished.
2. **Read the diff before you merge.** Even when CI is green. Especially
   when you're moving fast.
3. **Roadmap + build_log are updated on merge, not before.** The public
   artifact follows reality, not intent.
4. **Max 3 active branches at a time.** See `STATUS.md`.
5. **One session per branch. One branch per prompt.**
6. **Sessions subscribe to their own PR activity** via
   `mcp__github__subscribe_pr_activity` after opening the PR. They
   autofix CI failures and respond to review comments without you
   re-spinning them.

## Prompts

Canonical session prompts live in `prompts/`. Don't fire ad-hoc prompts
for roadmap work — extend an existing prompt file or write a new one.
Prompt files are reusable; chat transcripts aren't.

Naming: `prompts/NN-short-name.md`. Numbering tracks the roadmap order
loosely but isn't strict.

## Notifications

- `#vdm-builds` (Slack): GitHub PRs + Vercel deploys + CI status
- `#vdm-events` (Slack): waitlist, inference settlements, kill-criteria
  alerts
- Slack ↔ Claude Code direct integration is NOT installed by design.
  Slack carries *outputs* (PRs, deploys, events), not session chatter.

## Weekly review (Sundays)

30 minutes, Sunday evening:

1. Merge anything ready in `STATUS.md`.
2. Update `vdmnexus.com/roadmap` items where status has changed.
3. Write a build_log entry summarizing the week (≤280 chars).
4. Review kill-criteria in `CLAUDE.md` against the week's signals.

## Kill criteria

Listed in `CLAUDE.md` under "Roadmap → Kill criteria". If any triggers,
replan within 30 days. Don't carry on with the existing plan out of
inertia.
