# Polymarket flagship agent — pre-build compliance review

**Status: BUILD GATED.** One blocker, one yellow, two greens. Founder
sign-off required before any code is written.

Date: 2026-05-23
Operator: Spanish-resident autónomo, CNMV / DGOJ / SEPBLAC jurisdiction.

## TL;DR

| # | Question | Result |
|---|---|---|
| 1 | Polymarket geo allows Spanish residents? | ✅ Green |
| 2 | Polymarket ToS permits programmatic bots? | ✅ Green |
| 3 | Polymarket public API mature enough? | 🟡 Yellow — v2 is 2 weeks old |
| 4 | Spanish regulators OK with a *public* dashboard naming Polymarket? | 🔴 **Blocker** |

The agent itself — placing bets with the founder's own funds via the
vdm-nexus rail — is fine. The exposure is the public dashboard at
`vdmnexus.com/agents/predictions` displaying bets on a named unlicensed
(in Spain) operator. RD 958/2020 art. 23.1.b plus the "pronosticadores"
regime in art. 22 directly target this shape of content. Penalty range
under Ley 13/2011 art. 40.c is up to €1M.

## 1. Polymarket geo — Spain (green)

Spain is **not** on Polymarket's restricted list per two
Polymarket-owned sources:

- Help Center *Geographic Restrictions* names 33 restricted
  jurisdictions; the only EU members listed are Belgium, France,
  Germany, Italy (and per docs, Netherlands). Spain is absent.
- `docs.polymarket.com/api-reference/geoblock` tiers — Fully Blocked,
  Close-Only, Frontend-Only. Spain is on none of them.

Caveat: ToS §2.1.4 prohibits VPN circumvention; funds on a wallet that
traverses a blocked country may be locked indefinitely. A Spain-resident
operator on a Spanish IP is fine. Full ToS must still be read end-to-end
before launch — the `polymarket.com/tos` page did not render fully via
WebFetch.

## 2. Polymarket bot ToS (green)

Programmatic access is a first-class product:

- Official `Polymarket/agents` repo for bot frameworks.
- Official `py-clob-client-v2` Python SDK for order placement.
- Auth: L1 EIP-712 wallet signature once → derives L2 HMAC credentials.
  No MetaMask UI loop per bet.
- **KYC is required on the wallet** before API credentials are issued
  via the developer portal. That is the operator-side gate.
- No "bot whitelist," no per-account betting cap discovered in search
  snippets, no required public-disclosure clause — but the full ToS
  has not been read end-to-end. Treat as confirm-before-launch.

## 3. API maturity (yellow)

- `py-clob-client` (v1) was **archived 2026-05-11**. Final v0.34.6
  (2026-02-19). Anything on it is on borrowed time.
- `py-clob-client-v2` v1.0.1 released **2026-05-09** — two weeks old as
  of this review. 39 open issues. Workable but API shape may still
  churn; pin versions and budget for breakage.
- Rate limits (March 2026): POST /order 3,500/10s burst; 36,000/10min.
  Our profile — 4h cron scanning ~50 markets + ~5 bets/day — is three
  orders of magnitude under any limit.
- The SDK does **not** auto-retry on 429. Backoff is on us.

## 4. Spanish regulators — RD 958/2020 + Ley 13/2011 (BLOCKER)

The dashboard is the problem, not the agent.

### a. DGOJ jurisdiction (Ley 13/2011) — medium risk on user side, **high** on dashboard side

- Ley 13/2011 Título VI (arts. 39–42) penalises **operators,
  promoters, advertisers, and financial intermediaries** of unlicensed
  gambling. Art. 40.c penalises "promoting, sponsoring, or advertising"
  unlicensed gambling — up to **€1M**.
- DGOJ's published sancionadores register shows no public case of an
  individual Spanish resident being fined for betting on an offshore
  platform with their own funds in 2024–2026. Enforcement targets
  operators and affiliates.
- **The dashboard flips the founder from "user" to "promoter"** if
  DGOJ reads it as affiliate-shaped content under RD 958/2020 art. 23.1.b
  (below). At that point art. 40.c is live.

### b. RD 958/2020 — public dashboard as "comunicación comercial"

- **Art. 3** defines comunicación comercial broadly: any communication
  *directly or indirectly* promoting gambling activity or the image of
  an operator. Intent is irrelevant — *effect* is.
- **Art. 23.1.b** explicitly captures *"websites or applications whose
  main activity is sharing or publishing content or information about
  gaming activities defined in Ley 13/2011."*  A public dashboard of
  bets placed on Polymarket fits the literal text.
- **Art. 22 "pronosticadores"** regulates anyone publishing forecasts
  or results connected to betting. Publishing reasoned bets with stakes
  on a named platform is the regulated archetype — even with no
  commercial agreement with Polymarket.
- "Pure transparency, no link to operator, framed as AI research" helps
  but does **not** exit scope. RD 958/2020 catches *indirect* promotion;
  naming Polymarket creates discoverability. Promoting an *unlicensed*
  operator is the worse outcome under Ley 13/2011 art. 40.c.

### c. CNMV / MiFID II — low

- Polymarket outcome tokens are not MiFID II Annex I instruments.
- Even if a prediction maps to a real financial trade, CNMV's Guía
  asesoramiento exempts recommendations distributed via publications
  to the general public (the "non-personalised" channel exemption).
- Becomes live only if the dashboard turns paid / personalised
  (subscription signals, DM tipping).

## Decision the founder owes

The Polymarket side is shippable. The public-dashboard side is not, on
the same posture already locked in CLAUDE.md (`Active EU marketing
waits for the Spanish firm memo (roadmap item 11)`). The dashboard is
not "active EU marketing" in the obvious sense, but it is a public-facing
Spain-served surface naming an unlicensed-in-Spain gambling operator,
which is closer to the gambling-promotion line than the MiCA line we've
already drawn.

**Options.**

1. **Run the agent privately. No public dashboard.** Internal-only
   bookkeeping, founder-only access. Loses the content-engine pitch
   but ships compliantly today. Public surface added later if/when
   counsel approves a dashboard shape.
2. **Restructure the dashboard so RD 958/2020 art. 23.1.b doesn't bite.**
   Don't name Polymarket. No platform branding. No outbound links. Frame
   as "AI agent research output, model evaluation against real-world
   outcomes." Counsel still needs to bless — literal text of 23.1.b is
   broad enough that this is not obviously safe.
3. **Wait for the Spanish firm memo (Cuatrecasas / Garrigues / Uría)
   already on the roadmap as item 11.** Add this question to the brief
   — costs zero extra to fold in if the engagement is happening anyway.
   Push the public dashboard to post-memo. Build the private agent now.
4. **Drop Polymarket. Use Kalshi (CFTC-regulated, US-licensed).** User
   ruled this out for now — different USD/bank rail, doesn't match the
   on-chain payment story — but it's the cleanest path to a public
   dashboard.

The recommendation — given the rest of CLAUDE.md's compliance
posture — is some mix of (1) and (3): build the agent now as a
private operation, fold the question into the existing Spanish-counsel
brief, and ship the public dashboard once it comes back blessed.

## Verification sources

- [Polymarket Help Center — Geographic Restrictions](https://help.polymarket.com/en/articles/13364163-geographic-restrictions)
- [Polymarket Docs — Geoblock API reference](https://docs.polymarket.com/api-reference/geoblock)
- [py-clob-client-v2](https://github.com/Polymarket/py-clob-client-v2)
- [Polymarket/agents](https://github.com/Polymarket/agents)
- [Ley 13/2011 (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2011-9280)
- [Ley 13/2011 Título VI (infracciones)](https://noticias.juridicas.com/base_datos/Admin/l13-2011.t6.html)
- [Real Decreto 958/2020 (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2020-13495)
- [DGOJ expedientes sancionadores](https://www.ordenacionjuego.es/en/datos-estudios/actividad-historica/expedientes-sancionadores)
- [Cuatrecasas — RD 958/2020 analysis](https://www.cuatrecasas.com/en/global/art/entry-force-main-restrictions-advertising-online-gambling)
- [Senn Ferrero — RD 958/2020 analysis](https://www.sennferrero.com/2021/01/19/analisis-del-real-decreto-958-2020/)
- [CNMV — Guía asesoramiento en materia de inversión](https://www.cnmv.es/docportal/guias_perfil/guiaasesoramientoinversion.pdf)

---

# Phase A — what's built (private agent, no public surface)

The agent itself ships end-to-end. The public dashboard is gated until
Spanish counsel signs off (see top of this doc). What works today:

- **Scanner.** Fetches open Polymarket markets via the Gamma API,
  filters by category, liquidity, time-to-close, and price sanity.
- **Reasoner.** For each candidate, calls
  `nexus.vdmnexus.com/api/v1/chat/completions` via
  `X402Agent.pay_and_infer` (vdm-nexus PyPI SDK). Every reasoning
  call settles per-inference in USDC on Solana mainnet and returns a
  signed inference receipt.
- **Bankroll guard.** Hard caps in code (not config) —
  $50/bet, 5 bets/day, 30% bankroll per market, 30% 7-day drawdown
  auto-pause with optional Telegram alert.
- **Order placement.** Wraps `py-clob-client` against the Polymarket
  CLOB. KYC on the Polygon wallet is the operator-side prerequisite.
- **Resolution watcher.** Polls Polymarket on a separate schedule,
  computes PnL on resolved markets, writes the outcome back to
  Supabase.
- **Founder-only dashboard.** `vdmnexus.com/admin/predictions` —
  cookie-gated like `/admin/roadmap`. 60s auto-refresh. Stats, bet
  table, expandable reasoning, receipt links, Polygonscan tx links.
- **Cron.** Vercel Cron on `apps/web` hits two relay routes every 4h
  (scan) and every 30min (resolve). Relays POST to the external
  Python agent's webhook with a shared HMAC secret.

What is *not* built — explicitly:

- **`/agents/predictions` public page.** Gated on counsel sign-off.
- **`/agents` nav dropdown promotion of the agent.** Same gate.
- **Cross-market arbitrage / multi-vertical** beyond politics + economics.
- **Kalshi integration.** Different rail (US bank, not USDC on-chain).
- **Cross-agent learning** (depends on shipped Phase 5 infrastructure).
- **Try-it-yourself UI.** Read-only by design.

# Phase B — what unlocks the public dashboard

The Spanish counsel memo (Cuatrecasas / Garrigues / Uría) already on
the roadmap as item 11 (originally for the MiCA + token question)
adds one extra question: *can we publish a public dashboard of bets
placed on Polymarket, framed as AI research output, with no operator
naming or outbound links?*

If counsel returns yes (possibly with shape constraints), the
follow-up PR will:

1. Add an anon-read RLS policy on `public.polymarket_bets`
   (read-only of resolved + open bets, no future bets or draft state).
2. Build `apps/web/app/agents/predictions/page.tsx` mirroring the
   admin view but with whatever framing counsel approves.
3. Add a sub-link under the `/agents` nav dropdown.
4. Optionally promote the agent on the homepage "For operators"
   panel as the live demo.

If counsel returns no, the agent keeps running privately,
demonstrating the Nexus rail on real-world betting to anyone the
founder chooses to share individual receipts with.

# First-run runbook (operator)

Before the agent can place a single live bet, the operator owes the
following manual steps. The compliance review above MUST be
acknowledged first.

## 1. KYC the Polygon wallet on Polymarket

The wallet that will hold the betting USDC needs to complete
Polymarket's KYC flow at https://polymarket.com — this is a
one-time, manual, identity-verification step. The agent code cannot
do this for you.

Use a wallet that is:

- **Not** the Nexus deposit address.
- **Not** the Nexus operator key.
- **Not** the agent identity key (which only signs Nexus calls).

This is a dedicated **betting wallet** — its private key goes into
`POLYGON_PRIVATE_KEY`. Treat it like a hot wallet: minimal funds,
no other use.

## 2. Fund the betting wallet

Send $500 USDC (Polygon mainnet, USDC at
`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`) to the betting wallet.
The agent's `initial_bankroll_usdc` defaults to 500 in the Supabase
state row — adjust both if you fund a different amount.

You can verify on Polygonscan; the wallet's USDC balance must be
≥ stake + Polymarket fees before each bet.

## 3. Generate a Nexus agent identity for the reasoning calls

The Nexus agent (Ed25519 keypair) is separate from the Polygon
wallet. The Nexus agent signs the inference calls and pays in USDC
on Solana for each reasoning request. From the repo root:

```bash
source apps/nexus/.env.local   # to use the existing TEST_AGENT_SECRET on mainnet
# OR generate a fresh keypair:
python -c "from vdm_nexus import X402Agent; a = X402Agent.generate(); print(a.pubkey, a.secret_key_b58)"
```

Top up the new agent's Nexus credits balance (~$2 buys a lot of
reasoning at gpt-4o-mini-class pricing) by sending USDC to the Nexus
deposit address. See `apps/nexus/lib/deposits.ts`.

## 4. Local smoke test

```bash
cd agents/polymarket
uv sync                       # installs deps into .venv
cp .env.example .env          # then edit with real values
uv run python -m polymarket_agent bankroll      # prints current snapshot
uv run python -m polymarket_agent scan --max-decisions 1  # one reasoning call, one bet attempt
```

With `POLYMARKET_DRY_RUN=1` the scan runs end-to-end but skips the
CLOB order submission — every "bet" lands in Supabase with
`status='failed'` and `failure_reason='dry_run'`. Use this to prove
the full loop before risking a single USDC.

When ready, flip `POLYMARKET_DRY_RUN=0` and run again with
`--max-decisions 1` for a single live bet.

## 5. Deploy to Railway

```bash
cd agents/polymarket
# Push as its own Railway service. Railway auto-detects the
# Dockerfile.
railway login
railway init
railway up
```

Set the environment variables from `.env.example` in the Railway
service settings. Verify the deploy with:

```bash
curl https://<railway-host>/health
```

## 6. Wire Vercel Cron

In the Vercel project for `apps/web`, set:

- `CRON_SECRET` — any high-entropy string. Used by Vercel Cron
  itself in the Authorization header.
- `POLYMARKET_AGENT_URL` — the Railway service URL (e.g.
  `https://polymarket-agent-production.up.railway.app`).
- `POLYMARKET_AGENT_WEBHOOK_SECRET` — same value as `WEBHOOK_SECRET`
  in the Railway env.

The `apps/web/vercel.json` already declares both crons:

```jsonc
{
  "crons": [
    { "path": "/api/cron/polymarket-scan",    "schedule": "0 */4 * * *" },
    { "path": "/api/cron/polymarket-resolve", "schedule": "*/30 * * * *" }
  ]
}
```

## 7. Verify end-to-end

Open `vdmnexus.com/admin/predictions` after the first scan cycle.
You should see:

- the bankroll card populated,
- a "first bet appears here" empty state, OR
- the first bet row with reasoning expandable and a receipt link.

Click the receipt link — it should land at `vdmnexus.com/r/<id>`
showing the signed inference receipt for the reasoning call that
produced the bet.

# Manual operations

```bash
# Force a scan from your laptop (bypasses Vercel Cron):
curl -X POST https://<railway>/scan/sync \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET"

# Force a resolution check:
curl -X POST https://<railway>/resolve/sync \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET"

# Current bankroll:
uv run python -m polymarket_agent bankroll

# Unpause after a drawdown auto-pause (only after the operator has
# reviewed what went wrong):
psql "$DATABASE_URL" -c \
  "update polymarket_agent_state set paused=false, pause_reason=null where id='singleton';"
```

# Acceptance — Phase A complete when:

- [ ] Local `scan --max-decisions 1` with `DRY_RUN=1` writes one bet
      row to Supabase with `status='failed'`, `failure_reason='dry_run'`,
      and a receipt the verifier accepts.
- [ ] Local `scan --max-decisions 1` with `DRY_RUN=0` (and a funded,
      KYC'd Polygon wallet) places one live bet of $5–$10 on
      Polymarket and writes the corresponding row with `status='open'`.
- [ ] `/admin/predictions` renders that bet with reasoning expandable
      and receipt link landing on `vdmnexus.com/r/<id>`.
- [ ] The Spanish counsel question is added to the existing
      Cuatrecasas / Garrigues / Uría brief (roadmap item 11).
- [ ] No public surface is added — `/agents/predictions` does not
      exist, the `/agents` nav has no predictions sub-link.

