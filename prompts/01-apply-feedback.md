# Apply Feedback from #nexus

**Cadence:** Optional morning run (~09:00 Spain time / Europe/Madrid). The
nightly `prompts/00-daily-review.md` also performs this step; this lighter
routine just applies feedback faster.

Lightweight companion to `prompts/00-daily-review.md`. Reads Dennis's reactions
to the latest daily update in `#nexus` and applies any EXPLICIT change requests.
Does NOT run a full review.

## 1. Read feedback
- Read messages in the `#nexus` Slack channel (id `C0BDPTS89QS`) posted since
  the last run (most recent `planning/daily/` date, else last 24h).
- Focus on Dennis (dennis@vdmnexus.com) messages that explicitly ask to change
  something.

## 2. Classify
- Task / plan change ("drop X", "add Y", "do Z instead", "reprioritise") →
  `planning/NEXT.md` and the current `planning/daily/<date>.md` in the public
  `vdmnexus` repo.
- Business-plan change ("update the business plan: ...", "change our
  positioning to ...") → `business-plan.md` in the PRIVATE `vdmnexus/internal`
  repo.
- General discussion / brainstorming / anything not a clear instruction →
  DO NOT change any file.

## 3. Apply
- Make targeted edits; do not rewrite whole files.
- Touch `business-plan.md` (in `vdmnexus/internal`) ONLY on an explicit
  business-plan instruction. Never write business-plan content into the public
  `vdmnexus` repo.
- If an instruction is ambiguous, do not guess — list it back as a question in
  the Slack reply.

## 4. Commit & confirm
- Commit business-plan changes to `vdmnexus/internal`; commit plan/task changes
  to `vdmnexus`. Use message `chore(planning): apply #nexus feedback <date>`.
  Push. Skip entirely if nothing changed.
- Post a short `#nexus` reply: `Applied: <bullets>` and, if any,
  `Need clarification on: <bullets>`. If nothing was actionable, stay silent.

## Rules
- Only Dennis's explicit instructions cause file changes.
- The business plan lives ONLY in the private `vdmnexus/internal` repo; never
  commit business-plan content to the public `vdmnexus` repo.
- Read-only on code; writes limited to `planning/` (public repo) and
  `business-plan.md` (private repo).
