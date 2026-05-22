<!--
  Keep this short. The diff says what changed; this file says why,
  and confirms the workflow checks ran.
-->

## Summary

<!-- 1-3 lines. What this PR does and why. -->

## Roadmap

<!--
  Link the roadmap item this maps to:
  - "Phase 1 / Distribution / #1" (Python SDK) etc.
  - or "n/a (infra / fix / docs / chore)"
  See CLAUDE.md → Roadmap, and vdmnexus.com/roadmap for live state.
-->

## Type

<!-- pick one: feat | fix | refactor | docs | chore | infra -->

## Done checklist

- [ ] CI is green
- [ ] `STATUS.md` row updated to `in_review` (or removed if abandoned)
- [ ] `build_log` entry inserted in Supabase (`public.build_log`, ≤280 chars, with topical tags)
- [ ] `vdmnexus.com/roadmap` item status reflects this PR if user-visible
- [ ] `CLAUDE.md` updated if architecture / API / conventions changed
- [ ] No new top-level deps added to apps without justification
- [ ] No secrets, KMS keys, or `.env.local` content in the diff

## Test plan

<!--
  How to verify the change works. Be concrete:
  - "pnpm --filter @vdm-nexus/sdk test → 6 pass"
  - "Hit /chat/completions on mainnet, receipt verifies via verify.vdmnexus.com"
  - "n/a (docs only)"
-->

## Notes

<!-- Anything a reviewer needs to know that isn't in the diff. Keep brief. -->
