# marketing/media

Visual companions for `/ship-broadcast`. Terminal demos for every
shipped surface, plus a Remotion scaffold for "this week we shipped"
reels.

```
vhs/         — .tape scripts (charmbracelet/vhs) + the demo source they drive
remotion/    — Remotion project with one WeeklyShipsReel template
out/         — rendered GIFs / MP4s / WebMs (gitignored)
Makefile     — `make help` for the menu
```

## Why this exists

Every PR worth broadcasting has a demoable surface — `pip install` →
one call → a receipt lands. Today the founder ships text-only intent
URLs. With these tapes, every ship gets a 10-15s GIF you can attach in
the X composer, the Telegram channel, or the LinkedIn post. The
`.tape` script is the source of truth — re-runnable, diffable in PR
review, and free from "looks-real-but-isn't" screenshot rot.

## Prereqs

| Tool | Why | Install |
|---|---|---|
| [`vhs`](https://github.com/charmbracelet/vhs) | renders the terminal demos | `brew install vhs` (macOS) |
| `ffmpeg` | mp4/webm encoding for vhs | `brew install ffmpeg` |
| `node` 20+ | Remotion + verify-receipt demo | already required for the monorepo |
| `python` 3.11+ | Python SDK demos | already required for the Python packages |

The Makefile fails fast with an actionable message if `vhs` isn't on
`$PATH`. Don't `brew install` from inside a script — surface the
command and let the user run it.

## Render targets

```bash
cd marketing/media

make python-sdk-x402         # pip install vdm-nexus + pay_and_infer demo
make verify-receipt          # verifyReceipt() five-check demo
make langchain-chat-nexus    # ChatNexus inside a LangGraph node
make all                     # render every tape
make reel-weekly             # Remotion 10s reel for the last 5 ships
make clean                   # wipe ./out
```

Output lands in `out/<tape-name>.{gif,mp4,webm}`. That directory is
gitignored; rendered artifacts are either built in CI or by the user
right before scheduling a broadcast.

## How the demos avoid drift

Every tape drives a real script — `scripts/<demo>.py` or
`scripts/<demo>.mjs`. The scripts import the real SDK code path (the
same `@vdm-nexus/sdk-python` and `@vdm-nexus/x402` published to PyPI
and npm) and execute the same logic an end-user would. Only the
network is mocked — `httpx.MockTransport` on the Python side, a
locally-generated operator keypair on the Node side. So:

- The signature shape, base58 lengths, and base64 framing in the
  render are exactly what production emits.
- The receipt structure is the real `SIR v2` shape.
- The `verifyReceipt` call exercises the published verifier code.

That's the line we hold: realistically-mocked, not screenshot-mocked.
If something breaks in the SDK, these scripts break too — making the
demos a thin smoke test in addition to a marketing asset.

For renders we want to publish as evidence (e.g. a paid mainnet
call), use a sponsored devnet agent + the real endpoint instead of
the mock — call them `*-live.tape` so they're easy to find when the
live state drifts.

## Adding a new tape

1. Drop a `scripts/<demo>.{py,mjs}` that runs the surface end-to-end
   against a mock or sponsored devnet agent.
2. Drop a `vhs/<demo>.tape` next to the other tapes — copy the
   theme block from one of the existing tapes so brand colors stay
   consistent.
3. Add a target to the Makefile.
4. Render once locally to confirm it lands. Commit the `.tape`
   script and the demo source. Do not commit the rendered output.

## Brand

The terminal palette in every `.tape` file matches `apps/web`'s
design tokens:

```
bg:      #080810   (Set Background)
text:    #f1f5f9   (Set Foreground)
indigo:  #6366f1   (Set Cursor, magenta)
blue:    #3b82f6
```

Width 1280 × 720 is the X-attachment-friendly aspect; bump to 1920 ×
1080 for higher-fidelity LinkedIn or product-hunt renders.

## Remotion scaffold

`remotion/` is a self-contained Remotion project (its own
`package.json`, not in the pnpm workspace). It ships one composition:
**WeeklyShipsReel** — reads `ships.json`, renders one card per PR
with the type prefix as a chip, the title as the headline, and the PR
number as a footer.

To preview:

```bash
cd remotion && npm install && npx remotion studio
```

To render the reel to MP4:

```bash
make reel-weekly
```

See `remotion/README.md` for adding new templates.

## Tape ↔ broadcast wiring

When `/ship-broadcast <PR#>` runs, Step 3.5 of the workflow looks for
`marketing/media/out/<slug>.gif` for the matching ship and references
it in the draft footer. If the GIF isn't there, the user is prompted
to either (a) render it now (`make <target>`), (b) provide a Screen
Studio recording, or (c) skip the visual. See
[`../ship-broadcast.md`](../ship-broadcast.md) for the full flow.
