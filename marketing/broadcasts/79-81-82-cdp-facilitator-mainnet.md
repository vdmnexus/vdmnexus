# Broadcast — PRs #79 + #81 + #82 — first signed inference via CDP

Single thread covering the three-PR sequence that landed today: the
CDP-facilitator route variant (`?via=cdp` on `/chat/completions`), the
rpcUrl + permissive key parser bootstrap fixes, and the CDP-managed
fee-payer wiring that closed the loop.

## What shipped

- `?via=cdp` query-param switch on `/chat/completions` — routes paid
  calls through Coinbase's facilitator (`api.cdp.coinbase.com`)
  instead of our self-hosted one.
- CDP Secret API Key (JWT-signed) auth path on the nexus app.
- `X402Agent` SDK accepts `rpcUrl` so client-side builds don't hit
  the public Solana RPC throttle.
- Permissive CDP private-key parser — PEM (multi-line or collapsed),
  SEC1 EC PEM, base64 Ed25519 seed, JSON download. Env-var pipelines
  that drop newlines now work.
- CDP-managed fee-payer fetched from `/supported` and declared in
  the 402 challenge so CDP's facilitator accepts the payload.
- First end-to-end paid call settled through CDP on Solana mainnet:
  `r/9ba26246-13e5-4105-a891-eae3ca7ec64c`
- That single settlement triggers CDP's auto-indexer — Nexus appears
  on x402 Bazaar + agentic.market within ~6h.

## X (278 / 280 chars)

```
First signed inference settled through Coinbase's x402 facilitator landed on Solana mainnet today.

Same call routes Nexus into x402 Bazaar + Agentic.Market within ~6h. Self-hosted rail stays default for sovereign flows.

vdmnexus.com/r/9ba26246-13e5-4105-a891-eae3ca7ec64c
```

X intent URL (one-click compose):

<https://x.com/intent/tweet?text=First%20signed%20inference%20settled%20through%20Coinbase%27s%20x402%20facilitator%20landed%20on%20Solana%20mainnet%20today.%0A%0ASame%20call%20routes%20Nexus%20into%20x402%20Bazaar%20%2B%20Agentic.Market%20within%20~6h.%20Self-hosted%20rail%20stays%20default%20for%20sovereign%20flows.%0A%0Avdmnexus.com%2Fr%2F9ba26246-13e5-4105-a891-eae3ca7ec64c>

## Telegram (~660 chars, channel-announcement style)

```
The agent payment rail now speaks Coinbase's x402 facilitator.

What landed today on Solana mainnet:
• First signed inference settled through CDP — vdmnexus.com/r/9ba26246-13e5-4105-a891-eae3ca7ec64c
• Per-request switch: pass ?via=cdp on /chat/completions and settlement runs through Coinbase's endpoint instead of our self-hosted facilitator
• Self-hosted rail stays the default — sovereign flows when you want them, CDP routing when you want discovery indexing
• Receipt verifies end-to-end with all five SIR v2 checks

That single settlement is the bootstrap into the x402 Bazaar / Agentic.Market index. Nexus surfaces there within ~6 hours.
```

## Visual

No visual attached. Optional follow-ups:

- Receipt permalink card — `vdmnexus.com/r/9ba26246-13e5-4105-a891-eae3ca7ec64c` already renders with an OG image; X / Telegram will preview it. That alone is sufficient.
- `marketing/media/vhs/verify-receipt.tape` if you want a GIF showing the five-check verification render. `make -C marketing/media verify-receipt` → `marketing/media/out/verify-receipt.gif`.

## Scheduling status

Not scheduled. User to post manually via the X intent URL above + paste the Telegram block into the channel.

Suggested timing: post both within the same 15-minute window so the
narrative stays aligned across surfaces. European afternoon (15:00-17:00
CET) gives US-morning a clean read.
