# `@solana-agent-kit/plugin-vdm-nexus` — drop-in for the upstream PR

This directory contains everything needed to open the upstream PR
adding a VDM Nexus plugin to `sendaifun/solana-agent-kit`. The source
in `plugin-vdm-nexus/` is self-contained and compiles standalone with
`tsc` — no monorepo workspace setup required.

## What's in here

```
outreach/sendai-plugin/
├── README.md                                ← you are here
├── PR_TEMPLATE.md                           ← title + body for the upstream PR
└── plugin-vdm-nexus/                        ← drop into the fork's packages/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    └── src/
        ├── index.ts                         ← Plugin export + configure() helper
        ├── config.ts                        ← Shared plugin config
        ├── tools.ts                         ← LangChain / Vercel AI SDK helpers
        └── actions/
            ├── nexus-chat.ts
            ├── nexus-verify-receipt.ts
            └── nexus-get-deposit-address.ts
```

## How to open the upstream PR

1. **Fork `sendaifun/solana-agent-kit`** on GitHub
   (<https://github.com/sendaifun/solana-agent-kit>). The fork goes
   under your personal GitHub account — the SendAI team prefers
   personal forks for plugin contributions; it makes the contributor
   signature clear.
2. **Clone the fork locally** and `cd` into it, then check out the
   active development branch:
   ```bash
   git checkout v2
   git pull origin v2
   git checkout -b plugin-vdm-nexus
   ```
   SendAI's default branch is `v2` (the plugin-architecture rewrite);
   submit against it, not `main`.
3. **Drop the source in:**
   ```bash
   cp -r <this-dir>/plugin-vdm-nexus packages/plugin-vdm-nexus
   ```
   Plugins live under `packages/plugin-*/` in the SendAI monorepo,
   alongside `plugin-token`, `plugin-nft`, `plugin-defi`,
   `plugin-misc`, and `plugin-blinks`.
4. **Adjust the `solana-agent-kit` peer to workspace form.** The
   package.json in this drop-in ships with
   `"solana-agent-kit": "^2.0.7"` so it can compile standalone (with
   `tsc`) before being copied into the monorepo. Inside the fork,
   swap both the `peerDependencies` and `devDependencies` entry to:
   ```jsonc
   "peerDependencies": {
     "solana-agent-kit": "workspace:*",
     "@solana/web3.js": "^1.98.2"
   },
   "devDependencies": {
     "solana-agent-kit": "workspace:*",
     "@solana/web3.js": "^1.98.2",
     "@types/node": "^22",
     "typescript": "^5"
   }
   ```
   (matches the convention every other plugin in the tree uses — see
   `packages/plugin-token/package.json`.)
5. **Adjust the build setup if the monorepo prefers `tsup`.** Every
   existing `packages/plugin-*` uses `tsup` instead of bare `tsc`
   (dual CJS+ESM output). After dropping in:
   ```bash
   cp packages/plugin-token/tsup.config.ts packages/plugin-vdm-nexus/
   cp packages/plugin-token/tsconfig.cjs.json packages/plugin-vdm-nexus/
   ```
   and swap the `build` script in `package.json` to
   `"tsup --format cjs,esm --dts --clean"`. The current `tsc`-only
   setup also works (the `exports` block already declares both ESM
   and CJS entry points) but `tsup` matches house style.
6. **Install + verify locally:**
   ```bash
   pnpm install
   pnpm --filter @solana-agent-kit/plugin-vdm-nexus build
   pnpm --filter @solana-agent-kit/plugin-vdm-nexus check
   ```
7. **Commit + push:**
   ```bash
   git add packages/plugin-vdm-nexus
   git commit -m "feat(plugin-vdm-nexus): signed inference via x402 on Solana + Base"
   git push -u origin plugin-vdm-nexus
   ```
8. **Open the PR** against `sendaifun/solana-agent-kit:v2`. Title +
   body live in `PR_TEMPLATE.md` — paste them verbatim.

## What to expect from CI

The upstream repo's CI runs lint, typecheck, and `tsup` build on every
plugin PR. The plugin source has:

- **Zero new top-level deps** on `solana-agent-kit` core (the new
  `@vdm-nexus/x402` dependency lives inside the new plugin only).
- **Apache-2.0 license** matching the rest of the SendAI tree.
- **Standard plugin shape** — `{ name, methods, actions, initialize }`
  satisfying the `Plugin` interface from `solana-agent-kit`.
- **No tests yet** — the maintainers' standard is to land plugin
  source first and follow up with mock-based tests; mention this in
  the PR body.

If CI fails on missing `@vdm-nexus/x402` registry resolution, double-
check that the fork's package manager is set to install npm-published
deps (the package is live at
<https://www.npmjs.com/package/@vdm-nexus/x402>).

## Anchor — the first mainnet receipt

The PR body links <https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e>.
That permalink renders the SIR v2 receipt for the first paid
`/chat/completions` call on Solana mainnet — the proof that this
plugin exercises a live rail, not a demo endpoint. Click the "Verify"
button on the page to see the five-check verifier render green.

## After the PR is open

- Subscribe to the PR thread for review comments. The SendAI team
  reviews plugin PRs in the SendAI Discord (`#plugin-dev` channel) —
  ping there with a link to the PR after opening.
- Respond promptly to review feedback; rebase on `v2` if requested.
- Update the `STATUS.md` row in `vdmnexus/vdmnexus` to `merged` once
  the upstream PR lands, and add a build_log entry.
