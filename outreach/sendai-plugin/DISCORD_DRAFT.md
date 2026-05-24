# SendAI Discord — message draft (founder approval before posting)

**Target channel:** `#plugin-dev` (per the SendAI handoff README) — the
user task said `#plugins`. If the channel is named differently in the
current SendAI server layout, pick the closest match before posting.

**PR:** <https://github.com/sendaifun/solana-agent-kit/pull/576>

## Draft (single sentence, matches the casual technical tone other
plugin-PR announcements use)

> Opened a PR for `@solana-agent-kit/plugin-vdm-nexus` — pay-per-call
> signed LLM inference via x402 on Solana + Base, returns OpenAI
> chat-completion responses with a cryptographic receipt anchored to
> the on-chain settlement tx:
> <https://github.com/sendaifun/solana-agent-kit/pull/576>

## Alternates if a tighter line is preferred

- "PR up: `plugin-vdm-nexus` — x402-paid LLM inference + on-chain-anchored
  receipts for any SendAI agent. <PR link>"
- "Adding signed inference to SendAI: PR <link> drops in
  `@solana-agent-kit/plugin-vdm-nexus` — paid via x402, returns OpenAI
  body + verifiable receipt."

## After posting

- Subscribe to the PR thread for review comments.
- If reviewers prefer a different action-naming convention or want
  tests in the initial PR, rework and re-push to
  `2504VDM:feat/plugin-vdm-nexus` (no new branch needed).
- Once merged, update STATUS.md row + insert a build_log entry in
  Supabase.
