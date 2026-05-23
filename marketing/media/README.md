# marketing/media

Visual companions for `/ship-broadcast`. Terminal demos for every
shipped surface, a Remotion scaffold for "this week we shipped"
reels, and code-snippet PNGs via ray.so for code-shape ships.

```
vhs/         — .tape scripts (charmbracelet/vhs) + the demo source they drive
remotion/    — Remotion project with one WeeklyShipsReel template
out/         — rendered GIFs / MP4s / WebMs / PNGs (gitignored)
Makefile     — `make help` for the menu
```

## Visual source picker

Pick the right tool for the ship:

| Ship shape | Tool | Output |
|---|---|---|
| Terminal demo (SDK install → call → receipt) | VHS tape | animated GIF |
| UI / browser demo (admin page, playground, verifier) | Screen Studio | MP4 |
| Weekly summary / multi-PR roundup | Remotion `WeeklyShipsReel` | MP4 |
| Code shape *is* the news (new fn, install one-liner, API signature) | [ray.so](https://ray.so) | PNG |

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
| [`silicon`](https://github.com/Aloxaf/silicon) | renders code-snippet PNGs | `brew install silicon` (macOS) |
| JetBrains Mono font | brand font for code-snippet PNGs | `brew install --cask font-jetbrains-mono` |
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
`package.json`, not in the pnpm workspace). It ships three
compositions:

- **`LogoIntro`** (1920×1080) — 1.8s brand intro. Logo springs in, an
  indigo signature stroke draws under the wordmark, the "signed
  inference" tagline fades up. The literal-signature motion is the
  visual cue tied to the locked vocabulary.
- **`LogoIntroSquare`** (1080×1080) — same animation, square aspect
  for Farcaster / Instagram / Telegram bumpers.
- **`WeeklyShipsReel`** — opens with `LogoIntro`, then a title card,
  then one card per PR (chip + headline + summary), ends on a
  `vdmnexus.com` outro. Reads from `ships.json`.

To preview:

```bash
cd remotion && npm install && npx remotion studio
```

To render:

```bash
make logo-intro          # 16:9 logo intro (MP4 + GIF)
make logo-intro-square   # 1:1 logo intro (MP4 + GIF)
make reel-weekly         # full weekly reel with logo pre-roll
```

See `remotion/README.md` for adding new templates.

## Tape ↔ broadcast wiring

When `/ship-broadcast <PR#>` runs, Step 3.5 of the workflow looks for
`marketing/media/out/<slug>.gif` for the matching ship and references
it in the draft footer. If the GIF isn't there, the user is prompted
to either (a) render it now (`make <target>`), (b) provide a Screen
Studio recording, (c) export a code-snippet PNG via ray.so, or (d)
skip the visual. See [`../ship-broadcast.md`](../ship-broadcast.md)
for the full flow.

## Code snippets via ray.so

For ships whose news is a code shape — a new SDK function, an install
one-liner, an API signature — a single PNG from
[ray.so](https://ray.so) lands faster than a VHS render and reads
better than a wall of monospace inside the tweet body.

**Brand preset (use every time, so renders look like one product):**

| Setting | Value | Why |
|---|---|---|
| Theme | `Midnight` | Closest to our `#080810` bg. Switch to `Custom` and set bg `#080810` + accent `#6366f1` if you want pixel-perfect. |
| Background | on | The colored card frame is what makes ray.so look ray.so. |
| Padding | 64 | Default. Don't shrink — the breathing room is the brand. |
| Window controls | off | We're not faking a Mac terminal — VHS is for that. |
| Line numbers | off (default) | On only when the snippet references specific line numbers in the post. |
| Font size | 14-16 | Snippet should fill the frame without horizontal scroll. Trim the snippet, don't trim the font. |
| Language | auto, then verify | Auto-detect mis-tags `.ts` as `.tsx` occasionally. |

**Two workflows — pick whichever fits the moment:**

### A. CLI via `silicon` (fastest — preferred)

`silicon` is a Rust CLI that renders a syntax-highlighted PNG offline,
no browser, with a brand-aligned preset baked into the Makefile.
Install once: `brew install silicon`.

```bash
cd marketing/media

# From a file in the repo
make code-snippet FILE=../../examples/python-quickstart.py SLUG=python-quickstart

# From the clipboard (after copying a 6-12 line snippet)
make code-snippet-paste SLUG=pay-and-infer LANG=ts
```

Output lands at `out/<slug>-code.png`, gitignored, ready to attach
to the broadcast. The Makefile pins theme (`OneHalfDark`), font
(`JetBrains Mono` 20pt), background (`#080810`), padding (80), and
the soft shadow — override via env if needed (`SILICON_THEME=...`).

**Theme variants — when to override the default:**

The default `OneHalfDark` is the right choice 95% of the time —
balanced pink/cyan/green palette, clean readability, holds up at X
thumbnail size. Two situations worth overriding:

- **`SILICON_THEME=Dracula`** — for premium-feel launch posts (token,
  big-name partnership, founder-led narrative). Dracula renders
  `const` and other keywords as **italics**, which adds a designed,
  distinctive look. Slightly less crisp at small render sizes; reserve
  for hero moments.

  ```bash
  make code-snippet FILE=../../examples/token-announcement.ts \
    SLUG=token-launch LANG=ts SILICON_THEME=Dracula
  ```

- **`SILICON_THEME=Coldark-Dark`** — for the rare "this is enterprise
  audit-log infra" framing on LinkedIn. Muted palette, deeper blue
  card, less attention-grabbing — which is exactly the point for
  GRC-buyer-audience posts.

List the full bundled set with `silicon --list-themes` if you want to
experiment, but `OneHalfDark` / `Dracula` / `Coldark-Dark` are the
three brand-sanctioned options. Don't reach for `Monokai`, `Nord`,
or anything Solarized — they pull the eye away from our `#080810`
frame.

### B. ray.so browser flow (when you want to nudge layout)

When the snippet has unusual line lengths, when you want to tweak the
font live, or when you're working from a phone — use [ray.so](https://ray.so)
in the browser. Same brand preset (Midnight theme, padding 64, no
window controls, font 14-16). Export → PNG, save to
`marketing/media/out/<slug>-code.png`.

Both paths produce the same shape of artifact and reference it the
same way in the draft footer per the `## Visual` convention in
[`../ship-broadcast.md`](../ship-broadcast.md).

**Snippet hygiene:** the snippet in the PNG must be runnable. If the
post copies a different version of the same call into the body text,
they must match character-for-character. Diverging "marketing code"
from "real code" is how SDK docs rot.

**Don't use ray.so for:** terminal output (VHS), UI flows (Screen
Studio), or anything that needs motion. If the visual would benefit
from a cursor moving or a value updating, it's a tape, not a PNG.
