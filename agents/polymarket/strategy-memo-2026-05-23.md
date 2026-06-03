# Polymarket agent — strategic redesign memo

Date: 2026-05-23
Author: Claude (via founder's deep-dive session, claude.ai)
Status: input for the bot redesign session

> This memo lives in the repo so the next coding session can read it
> without needing to reload the strategic context from a chat log.
> Locked at time of writing — if anything in here gets superseded by
> a later strategy session, add a follow-up file rather than editing
> this one.

## Pushback on the framing

The original framing was "pure PnL vs narrative/proof value, optimise
for the second." That's wrong in a small but important way: a demo
bot that loses money loudly destroys the narrative faster than a bot
that prints small wins quietly. The receipts have no story value if
the decisions look stupid in retrospect. Sonnet's "PASS by default"
is the correct response to the generic prompt + 4-hour cadence + no
real edge — not a temperament bug. Build a defensible edge first,
then the receipts become proof of it.

## Landscape (May 2026)

- **Domer (a.k.a. JustKen)** — ~$300M lifetime volume, ~$4.8M PnL,
  poker-derived discretionary edge, semi-retired. Canonical prior
  the market is calibrated against. Not competition, but the field.
- **Polystrat (Olas/Valory)** — productised autonomous LLM agent.
  4,200+ trades in month one. **37% of agents positive P&L vs
  7–13% for humans, but 63% of agents still lose money.** New
  creation paused on protocol updates.
- **OpenClaw framework** — composable agent + skills + CLOB exec.
  One bot reported $115K/week, but 26% community skill
  vulnerability rate; ClawHavoc supply-chain incident.
- **Latency wallets** — `0x8dxd` turned ~$300 → $400K+ in a month
  on 15-minute crypto contracts. Sub-100ms bots capture ~73% of all
  Polymarket arbitrage profit. **14 of top 20 wallets are bots.**

## What edge actually lives at $10–$1000 scale

| Category | Status for us |
|---|---|
| Latency arb on crypto | ❌ Commoditised. Polymarket killed it with dynamic taker fees up to ~3.15% on 50¢ contracts. |
| Cross-platform arb (Polymarket ↔ Kalshi) | ❌ Kalshi requires US residency. Out. |
| Market-making / rebate harvesting | ❌ Needs bigger inventory, sub-second order mgmt, adverse-selection strategy. Not at $12. |
| **Resolution-language nuance** | ✅ **Underrated. LLM-shaped. Sonnet/Opus excellent at it.** |
| News-faster | ❌ Need <60s ingestion. We're at 4h cadence. Wrong architecture. |
| Time-decay / convergence | ⚠️ Underexplored. Slow politics markets parked at stale prices. LLM-tractable. |
| **Correlated-market consistency** | ✅ **Probabilistic Forest paper: >$40M extracted/year. Mispricings persist for hours. LLM strike zone.** |

## Minimum viable edge to build for

At $12 bankroll the bot doesn't need to beat the median bot. It needs
an edge that is (a) defensibly explainable in the receipt and (b)
positive-EV against a random policy.

1. **Resolution-language scrutiny** on $5k–$50k volume long-tail
   politics / policy markets. Markets too small for the latency
   crowd, too niche for Domer, where the resolution source is a
   single named document or court ruling Claude can analyse, and
   where the price reflects vibes rather than the rule text.
2. **Correlated-market consistency checks.** When Claude detects
   two markets on the same underlying event with inconsistent
   implied probabilities, take the cheaper side of the cheaper
   outcome.

Both are LLM-shaped. Both explainable in 200 words per receipt.
Both work at $50/bet max.

## Designing as Exhibit A for $NEXUS

### What the receipts are actually selling

The audience is the Business-tier audit-trail buyer at $299–$2K/month.
The **EU AI Act Article 12 deadline of 2026-08-02** is the sales
catalyst. Article 12 requires high-risk AI systems to support
automatic event recording over the system's lifetime, with full
reconstructability of algorithmic decisions, ≥6-month retention, and
deployer accountability for log retention. **The hardest requirement
is per-user attribution** — most enterprise AI logs use service
accounts and can't satisfy it.

The Polymarket bot is the perfect demo because:
- It has its own cryptographic identity (Ed25519 key).
- Every decision is signed and reconstructable.
- On-chain settlement gives a tamper-proof timestamp anchor no
  SaaS competitor has.
- The adversarial setting (a bot betting real money) makes the
  audit story credible in a way hello-world demos never do.

Pitch: *"If we can audit a trading agent, we can audit your
credit-scoring model."*

The receipt page at `vdmnexus.com/r/<id>` must look like an exhibit
that could be entered into evidence: prompt hash, response hash,
model + version, on-chain timestamp, operator signature, structured
decision (decision, confidence, edge_bps, key_signals). **Not like a
transaction.**

### The Solana/x402 narrative — what it is and isn't

x402 has processed >75M txs, 94k unique buyers, 22k sellers, ~$28k
daily volume. **Solana captured ~49% of x402 agent-to-agent share
mid-Feb 2026.** Daily volume is modest — this is infrastructure
phase, not mass adoption.

Per-call USDC settlement is **not** a buy-pressure story today.
It is a **credibility story**: an autonomous agent paying for its
own thinking, on mainnet, verifiably, in 2026 — when 99% of "AI
agents" are wrapper scripts hitting OpenAI on the founder's credit
card. Every receipt page must show the Solana tx hash with a
Solscan link.

## Five redesign recommendations (for the next coding session)

### 1. Two cadences instead of 4-hour scan

- **6h deep scan** — Opus over correlated-market clusters, looking
  for logical inconsistencies (Probabilistic Forest edge).
- **30min watch list** — Sonnet on a curated ~20-market pre-filtered
  list for resolution-language quality.

Both pay USDC. Both produce receipts. The current 4h scan does
neither well.

### 2. Tighter filter + first-call resolution audit

- **Filter:** `open + clean-resolution + $5k–$50k volume + 7–60d to
  close`. Gamma has volume, endDate, and tags.
- **First Sonnet call per market is a resolution audit only:**
  > "Given this resolution language and resolution source, what is
  > the invalid-resolution risk?"
- Reject anything above a threshold **before** any sizing or
  reasoning second pass.

### 3. Three-pass reasoning prompt

Replace the generic "look for edge, PASS by default" with a
structured three-pass:

1. **Resolution audit** — what does YES literally require, what's
   the source, what's invalid risk.
2. **Market context** — what are the 2–3 correlated markets, what
   do their prices imply.
3. **Decision** — given (1) and (2), is there an arbitrage-like
   consistency play or documented mispricing. Force the model to
   cite a specific reason from (1) or (2). If it can't, output
   PASS.

Receipt shows the structured reasoning, not vibes.

### 4. Kelly-fractional sizing — **honest framing matters**

Current `$50 flat cap on $12 bankroll` is aspirational, not active.

- **25% Kelly on stated `edge_bps`**, floor $1, cap $5 until
  bankroll crosses $100, then progressively widen.

**One important framing note**: at $12 bankroll, a "true" 25% Kelly
bet on a 5% edge is roughly $0.15 — well below the $1 floor. **The
floor will bind almost every time at this bankroll size; Kelly is
effectively just the ceiling.** That's fine, the floor is doing the
real work, but the receipt copy must not claim "Kelly-sized at 25%"
when the bet is actually floor-clamped — an auditor reading the
exhibit will catch the discrepancy and the audit-trail credibility
takes the hit.

Two honest framings, pick one per receipt:

- **"Floor-clamped, Kelly-capped"** — for bets where Kelly math
  produced < $1 and the floor took over.
- **"Kelly-sized"** — only when bankroll > ~$50 *and* the computed
  Kelly stake genuinely exceeds the floor.

The audit-trail story is stronger when the sizing language is
mechanically accurate. Don't dress up floor-clamped sizing as
Kelly-driven sizing.

### 5. Broadcasting cadence

**Do not** ship the dashboard yet (Spanish counsel gate still
applies). **Do** tweet one receipt per *resolved* market with a
link to `vdmnexus.com/r/<id>`. The boring drumbeat.

Reserve the dashboard reveal for when *all three* are true:
(a) Spanish counsel signs off,
(b) ≥30 resolved bets with a P&L screenshot,
(c) the EU AI Act deadline is within 60 days (news-peg).

**Be specific about what "30 resolved bets" means for the timeline.**
At the proposed cadence (6h deep + 30min watch) filtered to 7–60
day resolution markets, 30 resolved bets is realistically **6–10
weeks** out, not 2–3. Politics / policy markets in the $5k–$50k
volume band don't resolve fast.

Two paths, pick one and commit to it:

- **Widen the filter** to include some shorter-duration markets
  (with the resolution-quality bar *held high*) — pulls the
  dashboard window into Q3 2026 territory.
- **Accept the dashboard is a 2026-Q4 thing** — frame it that way
  from day one, news-peg the reveal against the AI Act enforcement
  ramp, don't accidentally back into a corner where it's "ready" in
  4 weeks because only 8 bets have resolved.

Either is fine. What's not fine is implicitly assuming we'll have
30 resolved bets in 4 weeks. We won't, and planning Q3 launch
comms against that assumption will hurt.

## Legal correction to verify — **Task #1, before any coding**

The original deep-dive claimed RD 958/2020 art. 23.1.b was annulled
by the Spanish Supreme Court in 2024, but the founder's follow-up
sharpened this: what actually got annulled in the April 2024
rulings was **RD 958/2020 art. 23 paragraph 1** as a whole (the
general prohibition on commercial communications via information
society services). Whether 23.1.b survives as a sub-clause is the
*specific* thing to verify.

The cleanest primary source is **STS 265/2024 and the related
April 2024 Supreme Court decisions, as published in the BOE.**
Osborne Clarke's secondary write-up is the clearest summary and
explicitly lists which articles fell — useful as a starting point,
not as the citation in our README.

Two corrections to make in `agents/polymarket/README.md` once the
BOE check completes:

1. Replace the "RD 958/2020 art. 23.1.b" cite with whatever the
   BOE actually confirms is still in force.
2. Replace "**Ley 13/2011 art. 40.c**" with **art. 40.b** — that's
   where the €100k–€1M fine band for promoting unlicensed gambling
   actually lives under the original numbering (very serious
   infractions). The 2025 amendment package is renumbering things,
   so verify the current operative version while you're in the BOE.

The substance of our compliance posture is unchanged ("we can't
publicly promote bets on a platform unlicensed in Spain without
exposure → public dashboard is counsel-gated, operate privately")
— **the specific article numbers in our README are probably both
wrong.**

### Why this goes first thing, before any coding

This is the only task with an external dependency and a binary
"right answer." Every other task (prompt rewrite, filter, sizing,
cadence split) is creative work — fun, expansive, easily eats a
whole morning. The pattern: you sit down to verify the cite,
something else feels more exciting, the BOE check slides to "later
this week," then to never.

Lock in 20 minutes of BOE reading + a one-line README update **as
the first action of the next session.** Then the rest of the day
runs clean.

## Three guesses, flagged

1. Highest-narrative-value receipt in first 90 days: a correctly
   called PASS on an ambiguous-resolution market that subsequently
   gets disputed and resolves 50/50. Negative action, maximum
   credibility.
2. Receipt format worth publishing as a draft spec: JSON-LD with a
   JSON-Schema for "AI decision record." That's how SIR v2 becomes
   a standard.
3. Polystrat's fleet-level non-profitability is probably from an
   aggressive default strategy. Our sober prompt is closer-to-right;
   the bug is cadence + filter, not temperament.

## TL;DR for the redesign session

Don't beat the latency bots. Don't out-news the news bots. Pick the
LLM-shaped edge — **resolution-language scrutiny + correlated-market
consistency** — and engineer the receipts to look like Article 12
exhibits. The bot's job isn't to print money. It's to be the most
boring, well-documented, defensibly-reasoned trading agent in
public, so that when the EU AI Act audit-trail buyer Googles
"verifiable AI inference," our bot is the working example. The
$11.94 isn't the bankroll. **The receipts are.**
