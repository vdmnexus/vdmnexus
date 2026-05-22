# Remotion ship reels

Standalone Remotion project for "this week we shipped"-style reels.
Not part of the pnpm workspace — `npm install` inside this directory.

## Quick start

```bash
cd marketing/media/remotion
npm install
npm run studio     # interactive preview at localhost:3000
npm run build      # → ../out/weekly-ships-reel.mp4
```

Or from `marketing/media`:

```bash
make reel-weekly
```

## Compositions

Each composition is its own React component under
`src/compositions/`. They are wired to the project from `src/Root.tsx`
via `<Composition id="..." ... />` declarations.

### `LogoIntro` / `LogoIntroSquare`

1.8s brand intro. The VDM Nexus logo (`public/vdm-logo.svg`) springs
in, an indigo signature stroke is drawn beneath the wordmark
(`strokeDasharray` interpolation — the visual cue of a literal
signature being made), and the "signed inference" tagline fades up.
Two presets:

- `LogoIntro` — 1920×1080 (horizontal, X / LinkedIn / docs.vdmnexus.com)
- `LogoIntroSquare` — 1080×1080 (square, Farcaster / Instagram / Telegram)

Render with `make logo-intro` or `make logo-intro-square` (both
outputs MP4 + GIF). Used as a pre-roll in `WeeklyShipsReel` and
intended as a standalone clip for social bumpers.

### `WeeklyShipsReel`

10-15 second reel that opens with the `LogoIntro` pre-roll, then a
title card, then walks through a list of recent ships (one card per
PR, ~2s each), and ends on a `vdmnexus.com` outro. Pass
`logoIntroSeconds={0}` to skip the pre-roll if you need a tighter
edit. Reads its data from `src/ships.json`:

```json
[
  {
    "pr_number": 65,
    "type": "feat",
    "title": "Python SDK + langchain-vdm-nexus on PyPI",
    "summary": "pip install vdm-nexus. Ed25519 identity, x402 USDC per call, SIR v2 receipts."
  }
]
```

`type` is one of `feat | fix | chore | docs | refactor | infra`. The
composition picks a chip color per type (indigo for feat, blue for
fix, gray for chore, etc.).

### Adding a new composition

1. Create `src/compositions/<Name>.tsx` exporting a default React
   component + a `<Name>Props` type.
2. Import it in `src/Root.tsx` and add a `<Composition id="<Name>" ... />`
   declaration with `width`, `height`, `fps`, `durationInFrames`.
3. Add an npm `build:<name>` script that calls
   `remotion render src/index.ts <Name> ../out/<output>.mp4`.
4. Optionally add a Makefile target in `marketing/media/Makefile`
   that wraps the npm script.

## Brand tokens

The composition uses the same palette as `apps/web` (see
`marketing/media/README.md`). If you tweak the tokens, change them in
both places — the canvas-design tokens are the source of truth in the
app, mirrored here for offline rendering.

## Output

Renders land in `../out/` (gitignored). Both MP4 and WebM are useful:
MP4 for X / LinkedIn uploads, WebM for browser-native embedding.
