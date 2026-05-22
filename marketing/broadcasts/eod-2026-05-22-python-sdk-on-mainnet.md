# End-of-day wrap — 2026-05-22

Daily summary post (not a per-PR broadcast). Covers the Python SDK
mainnet flip + the PyPI publishes + the awesome-x402 distribution sweep.

## What shipped today

- PR #66: Python SDK v2 PaymentPayload shape + 4-instruction tx
- PR #72: 0x80 v0 wire-format prefix fix (chain-side signature verify)
- PR #74: mainnet-only filter on `/api/recent-receipts` + `public.nexus_stats()`
- First Python SDK signed inference on Solana mainnet:
  `r/00240cb0-41e1-4adc-a88c-9a11a7ffc959`
- `vdm-nexus@0.2.2` on PyPI
- `langchain-vdm-nexus@0.1.0` on PyPI
- Three discovery surfaces submitted:
  - `Merit-Systems/awesome-x402#254`
  - `xpaysh/awesome-x402#419`
  - x402.direct issue (pending, queued for tomorrow)

## X (267 / 280 chars)

```
First Python SDK signed inference on Solana mainnet:
vdmnexus.com/r/00240cb0-41e1-4adc-a88c-9a11a7ffc959

vdm-nexus@0.2.2 + langchain-vdm-nexus@0.1.0 shipped to PyPI today.

Every LangChain / LangGraph / CrewAI agent can now pay per call in USDC and walk with a verifiable receipt. No API keys.
```

X intent URL (one-click compose):

<https://x.com/intent/tweet?text=First%20Python%20SDK%20signed%20inference%20on%20Solana%20mainnet%3A%0Avdmnexus.com%2Fr%2F00240cb0-41e1-4adc-a88c-9a11a7ffc959%0A%0Avdm-nexus%400.2.2%20%2B%20langchain-vdm-nexus%400.1.0%20shipped%20to%20PyPI%20today.%0A%0AEvery%20LangChain%20%2F%20LangGraph%20%2F%20CrewAI%20agent%20can%20now%20pay%20per%20call%20in%20USDC%20and%20walk%20with%20a%20verifiable%20receipt.%20No%20API%20keys.>

## Telegram (~620 chars, channel-announcement style)

```
The signed inference rail is now Python-native.

Today on mainnet:
• First Python SDK x402 settlement live — vdmnexus.com/r/00240cb0-41e1-4adc-a88c-9a11a7ffc959
• vdm-nexus@0.2.2 on PyPI — pip install vdm-nexus
• langchain-vdm-nexus@0.1.0 on PyPI — drop-in ChatModel for LangChain / LangGraph / CrewAI

Three v0 wire-format bugs squashed along the way. Python and TypeScript paths both land green five-check signed receipts end-to-end against the production rail.

This unlocks every Python agent framework. Distribution PRs already out to awesome-x402 (Merit-Systems + xpaysh) and x402.direct.
```

## Visual

No visual attached. Optional follow-up: `marketing/media/vhs/python-sdk-x402.tape`
→ `make -C marketing/media python-sdk-x402` → `marketing/media/out/python-sdk-x402.gif`
for X / Telegram. Skip if you want the post to ship plain.

## Scheduling status

- **Not yet scheduled.** User going to sleep; will post manually tomorrow morning.
- **X**: click the intent URL above when ready, hit Schedule, pick a time
  (suggestion: 09:00 CET — the European morning gives EU + US-early
  windows a fair shot before US-east afternoon)
- **Telegram**: paste the second block directly into the Nexus channel composer
- **Farcaster + LinkedIn**: skipped for this ship (X + TG is the headline pair)

## Tomorrow pickup

- Submit x402.direct issue (5 min, packet ready in `SUBMISSIONS.md` §3)
- Open Coinbase AgentKit upstream PR (packet in `outreach/agentkit-pr/`)
- Open SendAI plugin upstream PR (packet in `outreach/sendai-plugin/`)
- Track Merit-Systems#254 + xpaysh#419 for maintainer feedback
