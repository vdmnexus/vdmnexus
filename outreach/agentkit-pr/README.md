# `@coinbase/agentkit-vdm-nexus` — drop-in for the upstream PR

This directory contains everything needed to open the upstream PR
adding a VDM Nexus action provider to `coinbase/agentkit`. The source
in `agentkit-vdm-nexus/` is self-contained and compiles standalone
with `tsc` — no monorepo workspace setup required.

## What's in here

```
outreach/agentkit-pr/
├── README.md                                ← you are here
├── PR_TEMPLATE.md                           ← title + body for the upstream PR
└── agentkit-vdm-nexus/                      ← drop into the fork
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    └── src/
        ├── index.ts
        ├── nexus-action-provider.ts
        └── actions/
            ├── nexus-chat.ts
            ├── nexus-verify-receipt.ts
            └── nexus-get-deposit-address.ts
```

## How to open the upstream PR

1. **Fork `coinbase/agentkit`** on GitHub
   (<https://github.com/coinbase/agentkit>). The fork goes under your
   personal GitHub account (the team prefers personal forks for OSS
   contributions; it makes the contributor signature clear).
2. **Clone the fork locally** and `cd` into it.
3. **Create a feature branch:**
   ```bash
   git checkout -b vdm-nexus-action-provider
   ```
4. **Drop the source in.** The upstream layout puts individual action
   providers at `typescript/agentkit/src/action-providers/<name>/`, but
   maintainers may also accept it as a standalone framework extension at
   `typescript/framework-extensions/vdm-nexus/`. Two options:

   - **Option A — separate package (recommended for the first PR):**
     ```bash
     cp -r <this-dir>/agentkit-vdm-nexus typescript/framework-extensions/vdm-nexus
     ```
     This keeps the dep graph isolated — `@vdm-nexus/x402` doesn't
     touch the core `@coinbase/agentkit` package. Easier review.

   - **Option B — inline action provider:** move the source under
     `typescript/agentkit/src/action-providers/vdm-nexus/`, drop the
     `package.json` + `tsconfig.json`, and add `@vdm-nexus/x402` to
     the core agentkit `package.json` dependencies. Use this only if
     maintainers explicitly ask.

5. **Adjust the agentkit dep to workspace form.** The package.json in
   this drop-in ships with `"@coinbase/agentkit": "^0.10.0"` so it can
   compile standalone (with `tsc`) before being copied into the
   monorepo. Inside the fork, swap to:
   ```jsonc
   "devDependencies": {
     "@coinbase/agentkit": "workspace:*",
     ...
   }
   ```
   (matches the convention every other extension uses — see
   `typescript/framework-extensions/langchain/package.json`.)
6. **Install + verify locally:**
   ```bash
   pnpm install                              # or npm install
   pnpm --filter @coinbase/agentkit-vdm-nexus build   # if Option A
   pnpm --filter @coinbase/agentkit lint              # whole tree
   ```
7. **Commit + push:**
   ```bash
   git add typescript/framework-extensions/vdm-nexus
   git commit -m "feat: add VDM Nexus action provider (signed inference via x402)"
   git push -u origin vdm-nexus-action-provider
   ```
8. **Open the PR** against `coinbase/agentkit:main`. Title + body live
   in `PR_TEMPLATE.md` — paste them verbatim.

## What to expect from CI

The upstream repo's CI runs lint, typecheck, and tests on every PR.
The action-provider source has:

- **Zero new top-level deps** on `@coinbase/agentkit` (the new
  `@vdm-nexus/x402` dependency lives inside the new package only).
- **Standard Apache-2.0 license** matching the rest of the tree.
- **Strict TypeScript** + decorator metadata enabled (mirrors the
  existing `erc8004`, `spl`, and `cdp` action providers).
- **No tests yet** — the maintainers' standard is to land the source
  first and follow up with mock-based tests in a second PR (cf. the
  initial `erc8004` PR pattern). Mention this in the PR body.

If CI fails on a missing `@vdm-nexus/x402` registry resolution, double-
check that the fork's package manager is set to install npm-published
deps (the package is live at
<https://www.npmjs.com/package/@vdm-nexus/x402>).

## Anchor — the first mainnet receipt

The PR body links <https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e>.
That permalink renders the SIR v2 receipt for the first paid
`/chat/completions` call on Solana mainnet — the proof that this
provider exercises a live rail, not a demo endpoint. Click the
"Verify" button on the page to see the five-check verifier render
green.

## After the PR is open

- Subscribe to the PR thread for review comments. The Coinbase team
  typically reviews framework-extension PRs within 1-2 weeks; agentkit
  core changes can take longer.
- Respond promptly to review feedback; rebase on `main` if requested.
- Update the `STATUS.md` row in `vdmnexus/vdmnexus` to `merged` once
  the upstream PR lands, and add a build_log entry.
