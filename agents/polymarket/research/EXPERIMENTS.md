# Backtest experiment queue

Each experiment adds one contextual factor to the time-weighted Dixon-Coles core
and is judged by whether it improves RPS skill vs climatology on the 2018+2022
hold-out (`polymarket_agent/backtest_wc.py`). Keep, drop, or shrink per result.
Source research: [grok-research-2026-06-03.md](grok-research-2026-06-03.md).

Baseline to beat (current model, clean run 2026-06-03, combined 2018+2022):
**RPS skill vs climatology +11.7%** (2018 +15.5% / 64 games, 2022 +7.9% / 64 games).
Combined Brier model/base 0.587/0.644, outright accuracy 53.9%.

## 1. Rest days / differential rest  — DONE, DROPPED (2026-06-03)
- Built `polymarket_agent/exp_rest.py`: congestion covariate `beta*cong` added to
  each team's attacking log-rate, fit JOINTLY with attack/defence on
  pre-tournament data only (no test-set tuning). Two parameterizations tested.
- **Result: no bettable signal.** Combined hold-out RPS skill stayed at +11.7%
  (one-sided <96h penalty +0.00 pts; centered 1-7 day gradient −0.05 pts).
  Fitted beta had the right sign (negative → short rest lowers scoring) but
  negligible magnitude (goals ×0.996–0.999 per congestion unit).
- **Why it failed where the Bundesliga study held:** FIFA spaces WC fixtures
  4-6 days apart, so the <96h regime barely occurs — only 1-3 of 64 games per
  tournament hit it. The club-football congestion evidence (midweek+weekend,
  2-3 day turnarounds) does not transfer to World Cup scheduling.
- Filed as a settled negative. Re-open only if we ever model club leagues or
  Copa/continental cups with tighter spacing.

## 4. Recent form (momentum covariate)  — DONE, DROPPED (2026-06-03)
- Built `polymarket_agent/exp_form.py`: `form(team) = mean goal-diff-per-game`
  (or points) over the team's last K matches strictly before the date, clipped
  ±3, needs ≥3 priors. Encoded as a DIFFERENTIAL: `eta_home += beta*(form_h -
  form_a)`. Fit beta JOINTLY with attack/defence on pre-tournament data, scored
  the WC hold-out. Swept K∈{5,10} × metric∈{gd,points} to avoid cherry-picking.
- **Result: no signal — all four parameterizations DROP.** Combined hold-out
  RPS skill stayed at +11.7%→+11.5/11.6% (−0.13 to −0.21 pts):
  - K=5  gd      −0.19 pts   beta 2018 −0.0024 / 2022 +0.0118
  - K=10 gd      −0.13 pts   beta 2018 −0.0028 / 2022 +0.0144
  - K=5  points  −0.21 pts   beta 2018 −0.0004 / 2022 +0.0224
  - K=10 points  −0.15 pts   beta 2018 −0.0086 / 2022 +0.0273
- **Why it failed:** fitted beta is tiny AND sign-inconsistent across the two
  tournaments (negative in 2018, positive in 2022) — the joint fit can't decide
  what form even does. The hypothesis was that short-term form is information the
  540-day half-life rating smooths away; the data says it's already priced in by
  the time decay + importance weighting. Same lesson as rest (#1): a factor with
  a real club-football mechanism doesn't survive once the slow strength rating is
  already in the model. The rating IS recent form, just smoothed.
- Filed as a settled negative. Form adds nothing beyond the time-decayed rating.

## 5. Squad talent (FIFA player ratings)  — DONE, KEEP (2026-06-03)
- Built `polymarket_agent/exp_talent.py`: `talent(team) = mean Overall of the
  team's top-K players by Overall` (squad proxy), /10, encoded as a DIFFERENTIAL
  `beta*(talent_h - talent_a)` on the attacking log-rate, fit JOINTLY with
  attack/defence on pre-tournament data. The FIFA snapshot is point-in-time, so
  talent is only applied to training matches within WINDOW days of the opener
  (older matches → 0, like unknown form); attack/defence still fit on full
  history. Swept K∈{23,30} × window∈{365,730}.
- **Data — the no-lookahead unlock that market value (#3) lacked.** FIFA video-
  game ratings are versioned and locked BEFORE each season: FIFA 18 (Sept 2017)
  for the 2018 WC, FIFA 22 (Sept 2021) for the 2022 WC. So a 2018 squad-talent
  number is built from genuinely 2018-era ratings — no lookahead, unlike
  Transfermarkt's current-only pages. Source: Stefano-Leone-lineage CSVs
  (`amanthedorkknight/fifa18-all-player-statistics`, `abineshta/players_22`),
  cached in `.data/fifa{18,22}_players.csv`. Name map trivial (only
  Korea Republic→South Korea; Qatar absent from FIFA → 3 games uncovered).
- **Result: KEEP — first feature to beat baseline by a real margin.** All four
  params improve; best K=23/window=365: **+11.7% → +12.2% (+0.50 pts)**, 125/128
  games covered.
  - K=23 win=365  +0.50 pts   beta 2018 +0.0180 / 2022 +0.0153
  - K=30 win=365  +0.40 pts   beta 2018 +0.0109 / 2022 +0.0135
  - K=23 win=730  +0.20 pts   beta 2018 +0.0450 / 2022 −0.0041
  - K=30 win=730  +0.18 pts   beta 2018 +0.0434 / 2022 −0.0039
- **Why it's real (the test form failed):** beta is sign-STABLE and similar
  magnitude across two independent tournaments at the clean 365-day window
  (+0.018 / +0.015, both positive → more-talented side scores more). Form (#4)
  flipped sign between WCs (noise); talent agrees with itself (signal). The
  365-day window is both more principled (snapshot stays contemporaneous) and
  better; stretching to 730 days makes the snapshot stale and the 2022 beta
  decays to ≈0, confirming the mechanism. Effect ~8× the host edge because
  talent corrects EVERY rated game, not a rare event.
- **This fills the France blind spot:** a covariate that sees squad quality the
  score-only rating structurally cannot derive from past results. Confirms the
  governing lesson — factors downstream of results (rest, form) are absorbed by
  the time decay; only genuinely NEW information (venue, talent) survives.
- **NEXT (integration, 2026 path):** apply as a live prior in `sim.py` using
  CURRENT FIFA ratings (FIFA 24/25) — for a 2026 prediction "current" is exactly
  the right point-in-time, no lookahead concern. Use beta≈+0.016 (the 365-day
  cross-tournament average) on the talent differential. Demonstrate the France
  before/after on the champion sim. Chosen config: K=23, window=365.

## 2. Host advantage at "neutral" venues  — DONE, KEEP w/ caveat (2026-06-03)
- Built `polymarket_agent/exp_host.py`: apply the model's already-fitted
  `home_adv` term to the host nation's own WC games (no new parameter, no
  test-set tuning). Primary test = fraction 1.0 (full fitted edge).
- **Mechanism validated, hold-out near-flat.** Combined RPS skill +11.7% →
  +11.8% (+0.06 pts on the 8 host games of 128). The two hosts split:
  - **Russia 2018 (+0.9 pts):** reached the QF; full host edge moved its win
    probs toward reality (vs Saudi 0.52→0.65, vs Egypt 0.35→0.46). Worked as
    designed.
  - **Qatar 2022 (−0.8 pts):** first host ever to lose all 3 group games; the
    edge made the model *more* wrong. A genuine tail outlier (cf. South Africa
    2010 group exit), not evidence the edge is fake.
- **Decision: KEEP for the 2026 prediction path.** Per-game probability shifts
  are large and directionally correct in the majority case; the broad literature
  (+8–15% win prob) supports roughly full application; 2026 has THREE hosts
  (USA/Mexico/Canada) so it touches far more games than a single-host hold-out.
  Apply the full fitted `home_adv` to host-nation matches; flag "hosts
  occasionally collapse" as a standing calibration caveat.
- Note: this edge belongs in the **2026 prediction path** (pricing real markets),
  not in the historical hold-out where it barely moves. Don't rewrite
  `backtest_wc.py`'s neutral treatment for it.
- **INTEGRATED (2026-06-03):** wired into `sim.py` Engine via `HOSTS` +
  `HOST_EDGE` (full fitted `home_adv`=0.233 applied to USA/Mexico/Canada whenever
  they play). CLI: `python -m polymarket_agent.sim <n_sims> <host_edge_frac>`
  (frac 0 = neutral, for A/B). Effect on champion odds: Mexico 0.4%→1.2%
  (market 1.4%), Canada ~0.3%→0.9% (market 0.4%). Closes the host underpricing.

## 6. Altitude (ascent-penalty covariate)  — DONE, KEEP w/ caveat (2026-06-03)
- Built `polymarket_agent/exp_altitude.py`: each team carries an ASCENT
  PENALTY = `max(0, venue_alt - home_alt(team))/1000` (descending doesn't
  help, so one-sided), encoded as a DIFFERENTIAL `beta*(pen_away - pen_home)`
  on the attacking log-rate, fit JOINTLY with attack/defence. beta>0 = the
  better-adapted (less-penalised) side scores more. Static lookups: city ->
  venue altitude, nation -> home altitude (both default 0/sea-level for the
  unmapped majority; only the genuinely high venues/nations need entries).
  No time window — altitude is permanent geography, unlike the talent (#5)
  snapshot. Venue city read straight from results.csv (`load_city_map`).
- **The gate is DIFFERENT — this is the key design point.** Our usual hold-out
  (2018 Russia + 2022 Qatar) is BLIND to altitude: both sea-level, zero
  variation. So altitude is gated on World Cups that actually had altitude
  spread — 2010 South Africa (neutral, clean highveld/sea-level split),
  1986 Mexico, 1970 Mexico — with McSharry's CONMEBOL qualifier signal
  (La Paz 3640, Quito 2850) feeding the training fit. Which hold-out can even
  SEE the factor is as important as the feature.
- **Result: KEEP w/ caveat.** beta is sign-STABLE and positive in all three
  WCs (the signal test that killed form #4): 2010 +0.189 / 1986 +0.062 /
  1970 +0.145, ~+14% goals per km centrally — same order as McSharry's
  ~+0.5 goal/1000 m (~+37%), a bit conservative. Skill:
  - 2010 (neutral)  +0.189   high 37/64   +18.2% -> +17.9%  (-0.20 pts) DROP
  - 1986 Mexico     +0.062   high 44/52   +13.5% -> +14.5%  (+1.02 pts) KEEP
  - 1970 Mexico     +0.145   high 32/32   +16.5% -> +17.6%  (+1.11 pts) KEEP
  - combined                 high 113/148 +16.2% -> +16.7%  (+0.51 pts) KEEP
- **The caveat — the cleanest gate (2010) marginally DROPS** despite the
  largest beta. Why: the penalty differential is non-zero only when the two
  teams have DIFFERENT home altitudes; most 2010 highveld games were
  sea-level-vs-sea-level (differential ≈ 0, no correction). The effective
  moving sample was just the ~8 games involving an altitude-adapted side
  (South Africa 1500, Mexico 2240), which went slightly against it. Low
  power, not a fake effect — the beta is strongly positive FROM TRAINING.
- **Why it KEEPs for 2026 specifically:** the application is the 9 Mexico-venue
  matches (Mexico City 2240, Guadalajara 1566). The two gates that test
  exactly that — 1986 + 1970 Mexico — both KEEP at +1.0/+1.1 with large
  effective samples. It's the sea-level-heavy 2010 draw that's ambiguous, not
  the Mexican-highland case we care about. Weaker/more conditional than
  talent (which improved BOTH its gates); bank it accordingly.
- **NEXT (integration, 2026 path):** apply a SHRUNK beta (~combined +0.13, not
  the aggressive 2010 +0.19 which overfits the high-variance CONMEBOL signal)
  to ONLY the 9 Mexico-venue games in `sim.py`, using each team's home_alt vs
  the venue (Mexico City 2240 / Guadalajara 1566). Document the 2010 caveat.

## 7. Travel fatigue (within-tournament flight distance)  — DONE, KEEP (2026-06-03)
- Built `polymarket_agent/exp_travel.py`. travel(team, match) = cumulative
  great-circle km the team has flown between consecutive venue cities IN DATE
  ORDER up to and including this match, /1000. First appearance = 0 (unknown
  historical base camp). Encoded as a DIFFERENTIAL `beta*(travel_home -
  travel_away)`; the mechanism predicts beta<0 (the team that flew more scores
  less). Venues geocoded (lat/lon) for 2010/2014/2018/2022; haversine legs.
- **Why the gate had to be DIFFERENT from talent/altitude — the key design
  point.** Talent and altitude are properties a team carries into EVERY match,
  so their beta fits on the full 49k-international history. Travel fatigue only
  EXISTS inside a multi-venue tournament — two friendlies in two countries
  carry no within-event cumulative-flight differential. So the beta CANNOT be
  fit from general internationals (this is exactly why rest #1 felt similar but
  is different: rest is the inter-match GAP, present in every historical match
  and thus absorbed by decay; within-tournament travel DISTANCE is information
  the 49k history structurally never contains). Solution = two-stage,
  leave-one-WC-out: STAGE 1 fit strengths on all data before the target opener;
  STAGE 2 hold strengths FIXED and fit the single scalar beta by Poisson MLE on
  the POOLED matches of all PRIOR geocoded WCs; then score the held-out target.
- **Result: KEEP, and sign-STABLE negative — the signal test that killed
  form #4.** Leave-one-WC-out targets:
  - 2014 (beta from 2010)        beta -0.122  moved 48/64  +17.7% -> +21.6%  (+3.94 pts) KEEP
  - 2018 (beta from 2010+2014)   beta -0.109  moved 48/64  +15.5% -> +16.3%  (+0.72 pts) KEEP
  - 2022 (beta from 2010+14+18)  beta -0.098  moved 46/64  +7.9% -> +7.9%   (+0.02 pts) KEEP
  - COMBINED                     moved 142/192            +13.7% -> +15.3%  (+1.57 pts) KEEP
  Independent single-WC in-sample fits are unanimously negative on the three
  travel-VISIBLE cups: 2010 -0.136 / 2014 -0.108 / 2018 -0.066. (2022 fits a
  garbage +1.59 because its differentials are ~0 — max 0.09k km — so the MLE is
  unconstrained noise; it correctly contributes ~0 effect because beta*td≈0
  regardless. The degenerate gate behaving as a null is itself a good sanity
  check.) **I predicted DROP (assumed it was absorbed like rest). The gate
  overturned me.** That is the whole point of gating.
- **Effect size honesty.** beta≈-0.11 per 1000 km. Typical match differential
  is ~0.7-1.1k km -> ~8% goal suppression on the more-flown side; p90 (~2k km)
  -> ~15-25%. Larger than the "extra 1-2%" practitioners quote, so treat the
  magnitude as a soft upper bound — it may absorb a little venue-familiarity /
  draw-path confound that strength doesn't fully capture. The SIGN and its
  stability are what I trust; shrink the magnitude on integration.
- **Caveat — most of the combined lift is the 2014 line, fit on the smallest
  pool (2010 only, 64 matches).** The most credible target is 2018 (beta from
  128 prior matches) at a modest but same-sign +0.72. Bank travel as real but
  second-order, like altitude.
- **2026 relevance — unlike 2022, travel WILL move 2026.** 2026 is a
  normal-travel cup (avg ~5,167 mi/team, ≈ 2018's 5,441, below Brazil 2014's
  7,054) with real within-group spreads (per the user's charts: Algeria ~2,972
  vs Argentina ~461 group-stage mi). So a per-match travel differential is
  computable and non-trivial for 2026 — the Qatar inertness does NOT carry
  over. Clements et al. (PMC10286598) further says it's TIME-ZONE crossings
  (east-west), not raw north-south miles, that drive jet lag (>3h shift) and
  measured sprint/jump loss (>8h) — so a future v2 should weight east-west
  distance over total km. For now the raw-distance covariate already gates KEEP.
- **NEXT (integration):** add a SHRUNK travel beta (~-0.07, the credible 2018
  end, not the 2010-pool -0.12) to `sim.py`, driven by each 2026 team's
  reconstructed match-by-match venue path once the bracket/schedule is set.
  Pre-bracket it stays dormant (no path = no differential), so it's a
  tournament-time activation, not a static prior like talent/altitude.

## 8. Integration of the three KEEPs into sim.py — DONE (2026-06-03)
- Wired talent (#5), altitude (#6), travel (#7) into `sim.py`'s `Engine` as
  log-rate differentials, each in the EXACT encoding it was gated with.
- **Talent (#5): LIVE, as a FIXED gate-validated prior (+0.016), not a refit.**
  A live joint refit on current data inflated beta to +0.043 (~2.7x) because
  the only cached snapshot (FIFA22) is 3-5yr STALE vs 2024-26 matches — a
  vintage mismatch the backtest never had (there the snapshot was
  contemporaneous). Per Robberechts & Davis (mlsa18; see notes below), a
  refit larger than the validated value is a red flag, so we pin to the gated
  +0.016 and apply it on top of the baseline strengths. Unknown-talent teams
  (Iraq, Qatar...) suppress the differential to 0 (no spurious blowout).
  BLOCKED on FIFA26 ratings for a non-stale number.
- **Altitude (#6): LIVE at the 3 Mexican high-venue group games**, beta SHRUNK
  to the combined-gate +0.13. Penalty uses 2026 BASE-CAMP altitude (the user's
  logistics map), not home-nation altitude. Keyed by unordered pairing so the
  scoreline cache stays valid. Per-engine flag so the baseline can switch it off.
- **Travel (#7): DORMANT.** beta=-0.07 staged in, but it needs each team's
  match-by-match venue PATH, which only exists once the bracket has venues.
  Activates when the 2026 schedule is entered.
- **Champion-board effect is tiny; per-match effect is large.** With a clean
  baseline (covariates off) vs full stack, 20k sims:
  - France  6.5% -> 6.9% champion (+0.4 pts) — talent does NOT close the -10pt
    France market gap. Either the market overprices France (reputation/recency)
    or it prices path/pedigree neither the rating nor squad-talent sees. Open.
  - Mexico  1.1% -> 1.2% champion (+0.1 pts).
  But per-MATCH the same covariates swing hard: Mexico vs Czech +18.0 pts win
  prob (sea-level camp ascending to Azteca), vs South Korea +5.9, vs South
  Africa +0.8 (SA camps at 2432 > Azteca -> no penalty). France vs Norway +0.9.
  This is the Robberechts lesson in our own output: outright/tournament
  forecasts are noise-dominated by 7-game compounding; trust the PROPS.
- **Caveat to re-gate later:** when altitude+travel go fully live (full venue
  schedule), re-run the COMBINED model through the honesty gate — do NOT assume
  three individually-passing betas stack additively (Robberechts: ELO+ODM lost
  to ELO alone). The big +18pt Mexico-Czech swing also rests on the assumption
  Czech base-camps at sea level; a Tier-2 news check on actual base camps
  should confirm before trusting it as prop value.

## Notes — Robberechts & Davis, "Forecasting the FIFA World Cup" (mlsa18)
- Peer-reviewed near-twin of our method (KU Leuven). Result-based Elo + ODM
  goal ratings as covariates in ordered-logit / bivariate-Poisson, RPS loss,
  leave-one-WC-out, importance-weighted by competition. We independently
  rebuilt the academic SOTA. Reassuring.
- **Their headline: a SINGLE Elo-difference covariate in ordered logit beat
  everything** — bookmakers, Groll's random forest, and crucially the
  goal-based ODM and all ELO+ODM combinations (ELO 0.1860 RPS < ELO+ODM 0.1878
  < ODM 0.1949 on 2002/06/10/14). Adding a second strength signal HURT.
  -> Caution for our covariate stacking: re-gate combined, don't assume additive.
- **Tournament forecasts are unreliable even off a good per-match model**:
  "round of elimination correct for only ~half the teams"; their 2018 sim had
  Brazil 33% favourite (lost in QF); nobody but EA Sports called France.
  -> Hold our outright/champion edges LOOSELY; the per-match props are the
  trustworthy surface. Directly validates banking the France -10pt gap as a
  question, not a signal.
- No new feature to add; it's a methodology validation + two cautions.

## Standout 2026 edges from the live sim (6k sims, host edge on)
- **France −10.9%** (model 6.1% vs market 17.1%) — biggest disagreement. This is
  the MV blind spot: results-only ratings can't see France's squad talent.
  Strong motivation to un-park experiment #3 as a live prior.
- **Argentina +7.4%** (model 16.2% vs market 8.8%) — model's top value pick.
- Morocco +3.3%, Colombia +2.9% also flagged. Treat France as the headline
  caution: do NOT bet against France on the raw model until MV is incorporated.

## 3. Market value ratio (Transfermarkt)
- Add log(market-value ratio) as a team-strength covariate. Grok: outperforms
  FIFA/Elo for internationals; cleanest fix for the "France blind spot."
- **Data-source finding (2026-06-03):** Transfermarkt is reachable (browser UA,
  follow redirects). BUT the tournament "teilnehmer" pages serve *current* squad
  valuations regardless of `saison_id` — the 2018 (saison_id 2017) and 2022
  (saison_id 2021) participant tables are 53/57 byte-identical (France €1.56bn,
  England €1.37bn in both). So they CANNOT honestly backtest the feature on the
  2018/2022 hold-out — that would be lookahead. Point-in-time squad value needs
  per-player value-history (`marktwertverlauf`), a much heavier scrape.
- Revised options (awaiting decision):
  - **(A) Live prior + recent-match validation.** Scrape current national-team
    values (light) and (i) use as a live prior for the 2026 prediction path —
    where current values are exactly right, no lookahead — and (ii) validate the
    lift on ~2024-25 internationals, where "current" ≈ contemporaneous.
  - **(B) Heavy historical scrape.** Pull per-player value histories to
    reconstruct point-in-time squad values, enabling a clean 2018/2022 backtest.
- Status: PARKED (2026-06-03) — chose to build the 2026 prediction/pricing path
  first. Revisit MV as a live prior (option A) once the path exists.

## Edge B (in-play) — modeling half, offline calibration  (2026-06-03)
- Built `polymarket_agent/exp_inplay.py`: replays goal-minute timelines
  (`goalscorers.csv`), and at probe minutes models REMAINING goals as Poisson
  with rate `lam_full * (90-min)/90` conditioned on current score → live
  P(H/D/A). Pure time-scaling, no xG/momentum/cards. Fit strengths once before
  2021; tested on 2,536 matches whose replayed 90' score matches results.csv.
- **Verdict: mechanism ALIVE but not yet bettable.**
  - Brier sharpens correctly by phase: early 0.442 → mid 0.366 → **late 0.234**.
    The live model gains real information as the match progresses, as it should.
  - Overall calibration good (ECE 0.019), and excellent in the 0.0–0.7 range.
  - **BUT systematically OVERCONFIDENT on favorites/leaders:** predicts 0.86 →
    actual 0.79 (−7pp); predicts 0.75 → actual 0.70; predicts 0.97 → 0.95. ECE
    rises with phase (early 0.019 → late 0.048).
- **Why:** independent-Poisson ignores score-state behaviour — leaders sit back,
  trailing teams push, so late comebacks/equalizers happen MORE than the model
  thinks. It overrates whoever's ahead. This is the exact spot you'd bet, so the
  naive model would get PICKED OFF backing in-play favorites (an in-play France
  trap).
- **Next to make it bettable:** add a score-state correction (leading team's
  remaining scoring rate down, trailing team's up) and/or shrink high
  probabilities; re-run calibration; THEN the execution/feed/liquidity blockers
  still gate whether it's tradeable on Polymarket.

## 9. RE-GATE on the expanded 2010/2014/2018/2022 hold-out — DONE (2026-06-03)
Harness: `polymarket_agent/regate.py` (`python3 -m polymarket_agent.regate`).
Leave-one-WC-out over all four cups; strengths fit strictly before each opener;
features encoded EXACTLY as gated (talent/altitude as full-history differentials
fit jointly; travel two-stage, beta on PRIOR geocoded WCs only). The four-cup
baseline (strengths only) is **+14.8%** RPS skill vs climatology (2010 +18.2% /
2014 +17.6% / 2018 +15.5% / 2022 +7.8%, 256 games) — supersedes the old
two-cup +11.7% baseline (§1-8 numbers were measured on 2018+2022 only).

**Honest visibility (which cup can SEE which feature).**
- talent ABSTAINS on 2010/2014 (no FIFA-game file pre-2018) → moves 0/64 there,
  so its whole gate is still really the 2018+2022 pair. The 4-cup extension does
  NOT add talent evidence; it just doesn't break it.
- altitude moves on all four (geography is permanent) but only 2010 has a real
  highveld/sea-level split; 2014/2018/2022 differentials are near-zero noise that
  a global refit nonetheless perturbs.
- travel moves on 2014/2018/2022 (multi-venue); 2010 is the FIRST geocoded cup so
  it has no prior pool → abstains as target (0/64), correct by construction.

### Task 2 — each KEEP feature, re-gated individually (before/after)
| feature | beta (sign across cups) | combined skill | delta | verdict |
|---|---|---|---|---|
| baseline | — | +14.8% | — | — |
| host (full fitted home_adv) | n/a (no new param) | +14.4% | **-0.42** | DROP |
| talent | +0.018/+0.015 (2018/2022; abstains 2010/14) | +14.9% | +0.09 | KEEP (weak) |
| altitude | +0.189/+0.141/+0.171/+0.160 (all +) | +14.4% | **-0.38** | DROP on this gate |
| travel | -0.121/-0.108/-0.098 (all −) | +16.0% | **+1.18** | KEEP (strong) |

- **travel is the single strongest feature** and the only one that clears the gate
  with margin. Sign-stable negative on every cup that can see it.
- **talent survives but barely** (+0.09) and only because 2018/2022 carry it;
  sign-stable positive. KEEP as a thin prior, not a workhorse.
- **host DROPS** on the expanded gate: hosts collapse as often as they shine
  (Brazil 2014 1-7 SF, Qatar 2022 group exit both pull the full home_adv the wrong
  way). The +0.06 it showed on the 2018+2022-only gate (§2) was Russia's QF run
  carrying a 2-cup average; 4 cups wash it out.
- **altitude DROPS** on this gate (-0.38). It only ever KEPT on 1970/1986 Mexico
  (§6), which are OUTSIDE this hold-out. Within 2010/14/18/22 the only altitude-
  visible cup (2010) marginally drops (low effective sample), and refitting the
  global beta perturbs the three sea-level cups slightly negative. This is NOT a
  reversal of §6 — it's a different hold-out that is mostly blind to altitude.

### Task 3 — the COMBINED stack (the load-bearing gate)
The four KEEP betas do **NOT** stack additively — exactly the Robberechts caution.
| subset | host_frac | combined skill | vs baseline |
|---|---|---|---|
| baseline (strengths only) | — | +14.8% | — |
| travel | — | +16.0% | +1.18 |
| talent | — | +14.9% | +0.09 |
| **talent+travel** | — | **+16.1%** | **+1.26  ← WINNER** |
| host+talent+travel | 1.0 | +15.8% | +0.95 |
| host+talent+travel | 0.5 | +16.0% | +1.16 |
| host+talent+travel | 0.33 | +16.0% | +1.21 |
| alt+talent+travel | — | +15.8% | +1.03 |
| alt+host+talent+travel | 1.0 | +15.5% | +0.69 |
| alt+host+talent+travel | 0.5 | +15.7% | +0.91 |

- **The full four-stack (+0.69) is WORSE than travel alone (+1.18).** Adding host
  and altitude actively destroys ~0.5 pts of the travel signal. This is the
  ELO+ODM lesson reproduced in our own model: a second/third strength signal can
  degrade out-of-sample RPS. The gate, not intuition, killed two features I'd
  previously banked.
- **Winning stack = talent + travel** (+1.26). Betas in the combined fit stay
  sign-stable: talent +0.018/+0.015, travel -0.109/-0.098. Marginally better than
  travel alone (+1.18), so talent earns its place but contributes little.
- Folding host back in only helps if SHRUNK to ≤0.33 (and even then it's below
  talent+travel); at full strength it hurts.

### Decisions for the 2026 path
1. **Core stack = TALENT + TRAVEL.** These are the only two features that clear
   the expanded gate combined. Integrate both at their gate-validated betas
   (talent +0.016, travel -0.07 shrunk per §7), nothing larger.
2. **Altitude → demote to a SHRUNK, Mexico-venue-ONLY prior, flagged
   UNVALIDATED on this hold-out.** Its only positive evidence is 1970/1986 Mexico
   (§6), outside the 4-cup gate. Keep it wired in `sim.py` for the 9 Mexican-
   highland games but label it a mechanism-backed prior, not a gated feature.
3. **Host → DROP at full strength; if applied, shrink to ≤0.33** and treat as
   cosmetic. 2026 has three hosts so it touches many games, but the gate says the
   full edge is a net negative across cups.
4. **Revise `sim.py` §8 integration** — it currently stacks talent+altitude+travel
   additively as three co-equal KEEPs. Repoint to the gated truth: talent+travel
   as the validated core, altitude as a shrunk Mexico-only unvalidated prior,
   host off (or ≤0.33). Re-run the champion board after the change.

## Task 4 — feature hunt: StatsBomb pre-match xG  — REJECTED on data, not gated (2026-06-03)
The brief's top Task-4 candidate was a pre-match xG team-strength rating from
StatsBomb open data. **It is not honestly buildable point-in-time** — rejected
before gating, on the "never let a snapshot postdate the tournament" rule.
- StatsBomb men's-international open data is non-continuous: WC 1958/62/70/74/86/
  90/2018/2022, Euro 2020/2024, AFCON 2023, Copa America 2024. There is NO
  rolling international xG between tournaments. The most recent senior-international
  xG BEFORE the WC-2018 opener is **WC 1990** (28 years stale); WC 2014 is absent.
  So a contemporaneous pre-2018 national-team xG rating cannot be assembled.
- The club-league route fails too: deep coverage only for La Liga + Champions
  League; Premier League (2003/04, 2015/16), Bundesliga (2015/16, 2023/24), Serie
  A (2015/16), Ligue 1 (2015/16, 2021/22, 2022/23) are too sparse to build full
  23-man squad club-xG for 32 teams without La-Liga-biased missingness.
- The only xG that IS available for a WC team is its OWN matches inside that WC —
  a post-match performance indicator, explicitly out of scope.
- Verdict: not a gate failure, a DATA failure. Re-open only if StatsBomb (or
  another feed) ships continuous international event data with pre-tournament
  coverage. Until then xG cannot honestly enter the WC hold-out.

## 10. East-west / time-zone weighted travel vs raw km  — DONE, raw km STAYS (2026-06-03)
Built `polymarket_agent/exp_travel_ew.py`. Travel (#7) is the strongest gated
feature; §7 flagged a literature-backed v2 (Clements et al., PMC10286598):
weight TIME-ZONE crossings (east-west) over raw north-south miles, since circadian
disruption — not distance — drives measured jet-lag performance loss. Swapped the
leg-cost function inside the EXACT two-stage leave-one-WC-out gate #7 used and ran
it head-to-head against raw great-circle km. Variants: `km` (control), `tz`
(|Δlon|/15 hours, pure east-west), `tz_dir` (eastward ×1.5, phase-advance penalty),
`blend` (0.5 km + 0.5 tz).
- **Result — no east-west variant beats raw km. Settled negative.** Combined
  held-out RPS skill vs strengths-only:
  - km (control)  +1.57 pts
  - tz (pure EW)  +0.96 pts   ← clearly WORSE
  - tz_dir        +1.25 pts   ← worse
  - blend         +1.59 pts   ← +0.02 over km = NOISE, not a refinement
- **Why the literature mechanism lost the gate:** the cups carrying travel signal
  are 2014 (Brazil) and 2018 (Russia). Brazil's punishing hauls are largely
  NORTH-SOUTH (Manaus on the equator → Porto Alegre −30°); pure time-zone weighting
  downweights exactly those legs and the 2014 lift collapses +3.94 → +2.44.
  Distance-fatigue and circadian-fatigue BOTH matter; stripping distance discards
  real signal. The blend merely recovers raw km and adds nothing worth the
  complexity.
- **The signal is robust, the refinement isn't.** Every variant keeps a
  sign-stable negative beta (km -0.10/-0.11/-0.12, tz -0.06/-0.08/-0.10), so the
  underlying travel effect is confirmed yet again — it's only the east-west
  RE-WEIGHTING that fails to add value. The gate decides, not the literature.
- **Decision:** keep #7's raw great-circle km as the travel covariate for 2026.
  Do NOT adopt time-zone weighting. Re-open only with a future cup whose travel
  load is more purely east-west than Brazil's (or with per-player circadian data).

## 11. Task 5 — FC26 talent snapshot + sim.py realigned to the re-gate (2026-06-03)
Two-part task: (a) replace the stale FIFA22 talent proxy with a contemporaneous
2026 snapshot, (b) enter the 2026 venue schedule to activate travel. Part (a)
DONE; part (b) still blocked on the venue-per-match schedule.

**(a) FC26 talent — DONE.** Loaded EA Sports FC 26 (`fifa_version 26`, update 4,
released 2025-09 → lookahead-safe AND current) into `.data/fifa26_players.csv`;
added `2026: ("fifa26_players.csv", "nationality_name", "overall")` to
`exp_talent.FIFA_FILE` and seven FC26→results.csv name mappings (Czechia→Czech
Republic, Curacao→Curaçao, Cabo Verde→Cape Verde, Congo DR→DR Congo, Côte
d'Ivoire→Ivory Coast, Türkiye→Turkey, plus the existing Korea Republic). Covers
**44/48** group teams; Egypt/Iran/Jordan/Uzbekistan have <11 rated FC26 players
so talent correctly ABSTAINS (differential→0, no fabricated value). Spread sane:
France 85.2 / Spain 85.0 / Brazil 84.0 top, Curaçao 64.5 / South Africa 65.2
bottom. This retires the §8 "FIFA22 is ~4yr stale" caveat — the live talent
prior is now contemporaneous, the same condition the backtest gate enjoyed.
Gate beta unchanged (+0.016, fixed prior — NOT refit, per Robberechts).

**sim.py realigned to §9 (the re-gate decides, not §8's additive stack).**
- **Validated core = talent + travel.** Talent live on FC26; travel still
  DORMANT (`USE_TRAVEL=False`) — blocked on part (b).
- **Host shrunk 1.0 → 0.33** (`HOST_EDGE`). §9 dropped the full host edge
  (-0.42); the combined ablation only tolerated it ≤0.33. 2026's three-host
  always-home structure has no hold-out analogue, so capped + flagged, not full.
- **Altitude default OFF** (`USE_ALTITUDE=False`). §9 dropped it on the 4-cup
  gate; kept behind a flag as an UNVALIDATED Mexico-venue prior (its only
  support is 1970/86 Mexico, outside the hold-out). Flip the flag to price the
  Mexican high-venue games with the caveat.
- Renamed `FIFA_PROXY_YEAR`→`FIFA_TALENT_YEAR=2026` (updated `pool_picks.py`).
- Champion board (4k sims, host 0.33, talent on): Argentina 16.4% (market 8.9%,
  +7.5 top value), Spain 17.0%, France 6.4% vs market 17.1% (the −10.7 France
  gap PERSISTS even with FC26 talent — talent doesn't close it at champion
  level; the Robberechts "trust the props, not the outright" lesson again).
  Talent moves the champion board <0.1 pts (noise-dominated by 7-game
  compounding), as expected; its value is per-MATCH, not on the outright.

**(b) 2026 venue schedule — CLEARED (2026-06-03).** Travel (#7), the strongest
gated feature and half the validated core, is now LIVE. The official FIFA grid
(24 Sep 2024) was parsed for all 104 fixtures and encoded in `sim.py` as
`GROUP_FIXTURES` (per-group `(matchday, x, y, host_city)`, verified against the
standard pairing template and the R32/LATER bracket) plus `KO_VENUE`. Group
travel is deterministic, so `_build_group_travel()` precomputes `GROUP_TD`
(per-pairing km differential) and `GROUP_END_TEAM` (each team's cum-km +
last-city carried into the knockouts); knockout travel is threaded live through
the bracket since it depends on who advances. `USE_TRAVEL=True`; the engine
takes `beta_travel`/`travel` and a `td_travel` arg (cache bucketed to 100 km).
Re-confirmed on the champion board: France 6.5% → 14.7% (talent+travel lifts the
talent blind-spot team to ~2.3 pts under its 17.1% market line), Mexico 0.7% →
1.9%. The held-out RPS gate (exp_travel.py, +1.26 combined) is unchanged — the
2026 cities added to `VENUE_LATLON` are inert on the 2010–2022 backtest.

## Filed as LLM-layer priors, NOT model features
- Jet lag / time zones — weak/null outcome evidence in football.
- Heat / WBGT → unders bias on totals; altitude (Mexico City) → home edge.
- Key-player injuries, manager change — qualitative adjustments at prediction time.
