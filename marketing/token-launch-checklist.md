# $NEXUS — Launch Readiness Checklist

> Operational sequencing for the $NEXUS token launch on pump.fun
> (USDC pair) on Solana. Append updates here as items complete;
> don't delete — leaves an auditable trail.

**Launch venue:** pump.fun with USDC pair, Solana mainnet
**Ticker:** $NEXUS
**Issuer:** Spain-resident autónomo (see [/disclosures](https://vdmnexus.com/disclosures))
**Status:** pre-launch

---

## T-14 days — infrastructure must be running

Hard prerequisites before announcing a launch date. None of these
should be touched in the 48h window before launch.

- [ ] **Wire 1 Phase A merged + running in production for 72h+.**
      `burn_pool_ledger` table accumulating real USDC fees from
      mainnet `/v1/chat/completions` and `/v1/inference` calls.
      `/api/burn-pool` returning non-zero totals. Live counter on
      [/token](https://vdmnexus.com/token) showing accumulated USDC
      ready to convert at launch.
- [ ] **/token + /whitepaper rewrite merged and reviewed.** pump.fun
      USDC pair venue, four-wire dated calendar (Day 0/30/60/90),
      cross-agent learning + trust products sections. All
      `{{TODO}}` placeholders enumerated.
- [ ] **Beta framing live across all surfaces.** Pill in nav on web,
      docs, verify. Badge on all 8 package READMEs. Beta line on
      homepage hero.
- [ ] **[/disclosures](https://vdmnexus.com/disclosures) live.**
      Risk factors, autónomo issuer notice, MiCA framing, wire-ship
      risk.
- [ ] **/pricing live.** Per-call breakdown including receipt fee,
      Wire 2 preview.
- [ ] **/security live.** Architecture honesty, no-audit disclosure,
      responsible disclosure contact.
- [ ] **Mission Control v0 live at console.vdmnexus.com** with at
      least 5 seeded agent profiles (ship-broadcast, gitlawb,
      sponsored playground, Polymarket flagship if shipped, founder
      personal agent).
- [ ] **Legal scoping memo engaged.** Pérez-Llorca / Cuatrecasas /
      Finreg360 — whichever responds within €7K budget. Scope: each
      wire individually under ESMA March 2025 Guidelines and CNMV
      MiCA Q&A. Memo confirms (or restructures) Wires 3 + 4 before
      tweet.
- [ ] **Three Squads multisigs deployed on Solana mainnet.** Vault
      (15%), airdrop holding (10%), community pool (5%). Signers
      configured. Each separately deployed — Bubblemaps Solana will
      render as three distinct allocations, not a cluster.
- [ ] **Deployer wallet funded.** Minimum USDC needed to seed
      pump.fun pool + Squads multisig setup gas.
- [ ] **Receipt-fee burn address generated.** Public, tied to
      [/token](https://vdmnexus.com/token) burn counter. Will receive
      $NEXUS bought from accumulated USDC pool post-launch via
      Wire 1 Phase B.

---

## T-48h — final fills + comms

The launch window. Everything from T-14 must be done; this is where
placeholders get filled and the launch tweet is staged.

- [ ] **All `{{TODO}}` on /token filled:**
  - Token contract Solscan link
  - LP burn tx Solscan link
  - Three Squads multisig addresses
  - Deployer wallet address (Solscan link)
  - Bubblemaps Solana link
  - DexScreener Solana link
  - pump.fun pool link
- [ ] **Burn address published** on /token + /whitepaper + /disclosures.
      Wire 1 Phase B cron staged but not yet running.
- [ ] **Burn counter on /token** showing accumulated USDC ready to
      convert. Last 30 days of accumulation visualized.
- [ ] **Launch thread drafted via `/ship-broadcast`.** Single
      single-thread on X. Awaiting double-confirmation gate per
      `marketing/ship-broadcast.md`. MiCA red-line warning surfaced.
      Token-post double-confirmation acknowledged by founder.
- [ ] **Discovery listing packets queued.** Bazaar, Agentic.Market,
      x402.direct, awesome-x402. Submission scripts prepared, ready
      to fire within 6h of launch tweet.
- [ ] **ERC-8004 agent card published** (or planned for T+24h).
      Already scaffolded in PR #78.
- [ ] **Founder personal agent funded** on the Nexus rail to
      demonstrate live signed inference within the launch thread.
      Receipt link ready for the tweet.
- [ ] **Telegram + Farcaster + LinkedIn launch drafts prepared.**
      Same `/ship-broadcast` flow, all four channels. Posted in
      sequence within 4h of X tweet.

---

## T-0 — launch

The deploy + announcement window. Each step time-boxed; if any
fails, document why and decide whether to roll back or proceed.

- [ ] **pump.fun deploy** with USDC pair. Transaction signed by
      deployer wallet. Save tx signature immediately.
- [ ] **Verify on Solscan** within 5 minutes:
  - Token contract matches address on /token
  - Mint authority disabled
  - Supply = 100B
  - LP funded by deployer wallet
- [ ] **Verify on Bubblemaps Solana** within 10 minutes:
  - Three Squads render as three distinct allocations
  - No clustering with deployer wallet
- [ ] **Fund the three Squads multisigs** with their allocations
      (15% / 10% / 5%) from deployer wallet. Each transaction
      separate, time-spaced by 60s. Save tx signatures.
- [ ] **Fire launch thread on X** within 30 minutes of deploy.
      Single thread. Links: /token + /whitepaper + /disclosures +
      first-72h accumulation total + live signed-inference receipt
      from the founder's agent + Solscan token link + Bubblemaps
      link.
- [ ] **Post to Telegram, Farcaster, LinkedIn** within 4h of X
      tweet. Same content per platform from `/ship-broadcast`.
- [ ] **Submit to discovery listings** within 6h: Bazaar,
      Agentic.Market, x402.direct, awesome-x402.
- [ ] **Wire 1 Phase B cron deploys** within 24h. First USDC →
      $NEXUS buy-and-burn transaction executes. Save tx signature.
      Update burn counter on /token to show first burn.
- [ ] **Update `marketing/launch-plan.md`** with actual launch tx,
      first burn tx, and any deviations from plan.
- [ ] **Update [/roadmap](https://vdmnexus.com/roadmap)** —
      mark Phase 2 (Token launch readiness) complete, move Phase 3
      (Post-launch) to active.

---

## T+24h to T+30d — post-launch operating cadence

Not strictly checklist items — operating rhythm to keep the launch
narrative alive without overpromising.

- **Daily:** Mission Control screenshot showing accumulated burn
  pool draining + burn count rising. Post to X.
- **Weekly:** Roadmap update on [/roadmap](https://vdmnexus.com/roadmap)
  with concrete progress against Wire 2 (Day 30).
- **T+7d:** First weekly burn report tweet — total $NEXUS burned,
  USDC inflows, agent count growth.
- **T+14d:** Wire 2 threshold + discount % published publicly,
  7 days ahead of ship.
- **T+21d:** Wire 2 dry-run on devnet. Bug report from public
  beta-testers welcomed.
- **T+30d:** Wire 2 ships. Public smoke test from a fresh agent
  account. Receipt link posted.
- **T+60d:** Wire 3 ships (assuming legal memo confirmed structure).
- **T+90d:** Wire 4 ships. Verify SaaS paid tier opens. Retroactive
  airdrop criteria published.

---

## Kill criteria — pause launch if any trigger

These are pre-committed conditions under which the launch should be
postponed, not pushed through.

- **Legal scoping memo finds Wire 4 (or Wires 3+4) materially exposed
  under MiFID II** — restructure those wires (e.g., non-yielding
  reputation tokens) before launch. Do not ship a wire the memo flags.
- **CNMV publishes guidance specifically targeting agent-payment
  merchant rails or fair-launch utility tokens by Spain-resident
  natural persons** — re-engage legal, delay launch 30-60 days.
- **Wire 1 Phase A burn pool fails to accumulate** for 7+ days due
  to ledger / endpoint bugs — fix root cause before launch.
  Launching without a working burn loop is launching without the
  Wire 1 narrative.
- **/disclosures, /security, or Mission Control v0 fail to ship by
  T-14d** — slip launch by the gap, not the other way around. Do
  not ship a launch tweet that links to missing pages.
- **Founder unavailability in T-14d window** (illness, travel,
  family) — postpone. No good launch is a tired-and-distracted
  launch.

---

*Last updated: TBD. Append updates in dated entries below.*

## Log

- [date TBD] — initial checklist authored. All items pending.
