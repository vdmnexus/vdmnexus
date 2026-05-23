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

### 4. Kelly-fractional sizing

Current `$50 flat cap on $12 bankroll` is aspirational, not active.

- **25% Kelly on stated `edge_bps`**, floor $1, **cap $5** until
  bankroll crosses $100, then progressively widen.
- The receipt then shows responsible sizing — audit-trail buyers
  care about that.

### 5. Broadcasting cadence

**Do not** ship the dashboard yet (Spanish counsel gate still
applies). **Do** tweet one receipt per *resolved* market with a
link to `vdmnexus.com/r/<id>`. The boring drumbeat.

Reserve the dashboard reveal for when *all three* are true:
(a) Spanish counsel signs off,
(b) ≥30 resolved bets with a P&L screenshot,
(c) the EU AI Act deadline is within 60 days (news-peg).

## Legal correction to verify

The memo claims **RD 958/2020 art. 23.1.b was annulled by the
Spanish Supreme Court in 2024**, with a 2025 amendment trying to
reinstate via Law 13/2011 (incl. DGOJ Register of Gambling Suppliers,
€100k–€1M fines for unlicensed promotion).

Our `agents/polymarket/README.md` cites art. 23.1.b as the live
blocker. If the annulment is real, the specific citation is wrong
— but the *conclusion* (counsel-gated public dashboard, fine to
operate privately) is unchanged, because Ley 13/2011 art. 40.c
(promoting unlicensed gambling) is unaffected.

**Action:** verify the 2024 annulment via primary source (BOE,
Supreme Court ruling text, or Spanish counsel) **before** editing
the README. Don't change documented compliance posture on
secondary-source claim.

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
