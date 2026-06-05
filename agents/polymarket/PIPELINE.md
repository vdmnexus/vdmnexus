# Football prediction pipeline

> Living design doc for the 2026 World Cup model. Source of truth for the
> data sources, the feature registry, and the rule that lets a feature enter
> the model. Update this file whenever a feature gates in or out.

## The one rule: the gate decides

A covariate enters the model **only** after it beats climatology on held-out
Ranked Probability Score (RPS), backtested on the 2018 + 2022 World Cups via
`backtest_wc.py` / `regate.py`. Ingesting data is always fine; *modeling* with
it is gated. Two filters decide whether a feature is even eligible to be gated:

1. **Point-in-time** — there must be a snapshot of the data locked *before*
   each backtest tournament (2018, 2022). No historical snapshot → no
   backtest → no gate → cannot enter. (This is why talent uses frozen FIFA
   game versions, not current-only Transfermarkt values.)
2. **Beyond the rating** — the Dixon-Coles attack/defence/home parameters
   already capture scoring/conceding strength from results. A feature earns
   its place only if it carries signal the time-decayed rating *cannot
   derive*. Anything already "priced in by decay" (form, rest) dies here.

A third, practical filter governs the *automated* pipeline:

3. **Pipelineable** — CI must fetch it token-free, daily. Token-gated or
   Playwright-only sources can't run in the cron and are excluded from the
   live model (manual one-off cross-checks only).

## Pipeline stages

```
  DATA SOURCES ─→ INGEST ─→ RATINGS FIT ─→ COVARIATES ─→ ENGINE ─→ SIM ─→ EXPORT ─→ WEB
       │                         │            (gated)                              
       │                         └────────────────────────────┐                   
       └──────────────────────────────────────────────→ GATE HARNESS              
                                                    (backtest 2018/22 vs climatology)
```

| Stage | Module(s) | Role |
|---|---|---|
| Sources | — | martj42 CSV, FIFA ratings trim, 2026 schedule, Polymarket |
| Ingest | `ingest.py`, `store.py`, `calibrate.load_results` | feed → Supabase + in-memory matches |
| Ratings fit | `calibrate.fit_ratings` | Dixon-Coles attack/defence/home, time-decayed |
| Covariates | `exp_*.py` + flags in `sim.py` | gated features layered onto the rating |
| Engine + Sim | `sim.py` | Monte-Carlo tournament; pins played 2026 games |
| Export | `export_scores.py`, `export_tournament.py` | `scores.json` + `tournament.json` |
| Gate harness | `backtest_wc.py`, `regate.py` | RPS vs climatology — the judge |

## Data sources

| Source | Feeds | Access | Point-in-time? |
|---|---|---|---|
| martj42 `results.csv` | ratings, pinned results, climatology | token-free HTTP | ✅ full history |
| FC/FIFA player ratings | talent (pool) | committed `refdata/` trim | ✅ versions lock pre-cup |
| 2026 venues / schedule | travel, altitude | hardcoded in `sim.py` | ✅ fixtures known |
| Polymarket gamma API | edge column (**display only — not a model input**) | token-free HTTP | n/a |
| Announced 26-man rosters | roster-talent *(building)* | manual → commit `refdata/` | ✅ historical squads documented |
| Coach metadata | coach covariate *(building)*; xG-profile window | `refdata/coaches_2026.csv` | ⚠️ proxy only |
| Injury / availability | availability adjustment *(building)* | curated list → `refdata/` | ⚠️ hard, point-in-time |
| Fotmob match xG / shotmap | team_profiles (**display only**) | token-free SSR hydration | ⚠️ 2022+ only (no 2018) |

## Feature registry

| Feature | exp file | Status | Beyond rating? |
|---|---|---|---|
| Base rating (attack/def/home) | `calibrate` | **CORE** | — |
| Host edge ×0.33 | `exp_host` | **LIVE** | venue |
| Squad talent (roster) β +0.016 | `roster_talent` | **LIVE** | ✅ "France blind spot", sharpened to announced 26 |
| Squad talent (pool) | `exp_talent` | SUPERSEDED by roster | ✅ — roster beat it on the gate |
| Travel fatigue (km) β −0.07 | `exp_travel` | **LIVE** | within-tournament |
| Altitude | `exp_altitude` | DROPPED | failed gate |
| Heat (both mechanisms) | `exp_heat` | DROPPED | failed gate — differential −0.7 pts RPS; symmetric ~0.0 and wrong-signed |
| Rest / congestion | `exp_rest` | DROPPED | priced in by decay |
| Form / momentum | `exp_form` | DROPPED | priced in by decay |
| xG (provider, StatsBomb) | `exp_xg_gate` | DROPPED | gate-tested −0.05 pts RPS — priced in (β sign-stable but redundant) |
| Big chances | `exp_xg_gate` | DROPPED | gate-tested −0.09 pts RPS — priced in |
| Through balls | `exp_xg_gate` | DROPPED | gate-tested −0.61 pts RPS — priced in |
| Home-grown coord xG | `exp_xg` | DORMANT | model validated (AUC 0.807); rating gate-tested as xG above → DROP |
| East-west travel | `exp_travel_ew` | PENDING (un-run) | refinement of travel |
| Base-camp travel | `exp_travel` + `refdata/base_camps_*.csv` | PENDING (data) | refinement of travel |
| **Roster talent** | *(planned)* | **COMMITTED — build** | ✅ sharpens talent |
| **Coach quality** | *(planned)* | **COMMITTED — build** | weak prior |
| **Injuries / availability** | *(planned)* | **COMMITTED — build** | ✅ but data is hard |

## Committed build order

1. **Roster talent** — ✅ **DONE / LIVE** (2026-06). Restricts talent to the
   actual announced 26-man squad (`roster_talent.compute_roster_talent`).
   Gated head-to-head vs pool-talent on 2010/14/18/22: roster **+0.14 pts** RPS
   skill vs pool **+0.09** (driven by 2018, where the β nearly tripled 0.019→
   0.051 — the squad-restriction sharpens the signal). Promoted: `export_scores`,
   `export_tournament`, `pool_picks`, `sim` now load `roster_talent.load_live_talent`,
   reading frozen `refdata/roster_talent_{2018,2022,2026}.csv` (committed, so CI
   needs no `.data/` dump; re-run `python -m polymarket_agent.roster_talent freeze`
   if 2026 squads change). β kept at the established 0.016 (same mean-top-K/10
   scale as pool; conservative — re-tuning could extract more). Low-coverage
   teams (squad name-join < MIN_SQUAD: Iran, Egypt, etc.) **abstain** (neutral
   talent), exactly as gated.
   **Gotcha learned:** a roster+pool *blend* (pool fallback for the abstaining
   teams) was gated and **LOST** (−0.02 pts, worse than pool): mixing roster-
   scaled and pool-scaled teams makes the cross-team talent differential
   incoherent. Pure roster (consistent scale, abstain elsewhere) is the only
   version that wins. Ship pure roster, never the blend.
   **Also rejected (2026-06):** a **Sofascore avg-player-rating** squad feature
   — superficially KEEP (+0.32 pts) but the fitted β was **wrong-signed and
   unstable** (−0.08 / −0.29 across folds = noise, not signal), and it's
   redundant with talent. DROP. (Sign-stability is the signal-vs-noise test.)
2. **Coach quality** — build a point-in-time coach proxy (career win-rate /
   prior-tournament Elo of teams managed), snapshot for 2018/22, gate it.
   Weak prior — likely DROP, same trap as form/rest. Let the gate decide.
3. **Injuries / availability** — curated point-in-time "key player out" list
   feeding a talent adjustment. Highest ceiling, hardest data. Must clear the
   gate or it doesn't ship.

## Future / speculative (not gateable today)

Two heat ideas survive the literature but **cannot be gated now** — neither has
point-in-time data on hand. Logged so they aren't re-litigated; both are
DROP-by-default until someone builds the data. Heat as a *symmetric* or
*differential-acclimatization* effect is already settled DROP (`exp_heat`, both
mechanisms; see registry). These two are different mechanisms:

- **Heat × counterattack-reliance** — the heat literature is consistent that
  weather suppresses *physical* output (sprints, high-intensity running) while
  *technical/outcome* output is paced to stay flat (Illmer & Daumann 2022, 21
  studies; Zhong et al. 2024). The one channel that could break symmetry: heat
  blunts the high-intensity transition runs that fuel counterattacks, so it
  should hurt *counterattack-reliant* teams more than possession teams. That's a
  per-team interaction, not a venue main-effect — so it needs a per-team
  counterattack-reliance rating (candidate home: the `style`/`tactics` fields in
  `apps/wc/content/teams/*.json`) snapshotted point-in-time for 2018/2022. No
  such historical style rating exists yet → not gateable. If built: A/B
  `beta * heat_stress * (cattack_away − cattack_home)` on 2018+2022 RPS, promote
  only if it wins. A **2026-only** rating now exists at
  `refdata/counter_reliance_2026.csv` (high/medium/low per team, from the
  jwalker_2026 scouting doc; mirrored display-side in the `counterReliance` field
  of `apps/wc/content/teams/*.json`). It is **ingest-only / ungated**: 2026 has no
  results to score and the file is not point-in-time, so it is **not read by
  `sim.py`** and must not be wired in until the 2018/2022 historical ratings exist
  and the A/B above is won. It can feed the *live* engine only.
- **Base-camp climate acclimatization** — distinct from base-camp *travel*
  (above). Illmer & Daumann note (via Buchheit 2011) that pre-cup training camps
  can acclimatize squads to match-venue heat, and Brocherie 2015 found acclimated
  (Gulf) teams gain an outcome edge over non-acclimated opponents in heat. The
  gateable version is a differential "camp-climate vs venue-climate match" term —
  but it needs point-in-time camp *climate* for 2018/2022 (we only have 2026 camp
  *locations*), so it can't be scored today. Note: this is the acclimatization
  cousin of the differential-heat term `exp_heat` already DROPPED on raw
  home-climate; the new angle is camp climate, not home climate.

Not committed: **east-west travel** stays a pending un-run experiment
(`exp_travel_ew`) — one run settles KEEP/DROP. **Base-camp travel** is a
pending *data* task: `exp_travel.compute_travel` already accepts an optional
`base_camps={team:(lat,lon)}` to count the camp→opening-venue first leg (None
reproduces the venue-to-venue baseline exactly). Templates live at
`refdata/base_camps_{2018,2022,2026}.csv` (team names pre-filled).
**2026 is filled** (announced FIFA training-site list, geocoded to facility
city) — but 2026 has no results to score, so it can only feed the *live*
engine, not the gate. The gate scores held-out **2018+2022** RPS, so those two
files (still lat/lon-blank) must be filled to settle KEEP/DROP. Once they are:
A/B base-camp vs venue-to-venue on 2018+2022, and promote into `sim.py` only
if it wins. Don't wire it live until that gate passes.

## Fotmob xG / shot-quality — assessed, ungated, shipped as display

An earlier note here claimed Fotmob was "designed out" (token-gated, can't be
point-in-time'd). Two of those three claims were **wrong** and are corrected by a
2026-06 investigation; the conclusion (not a model input) stands, for a sharper
reason. Findings:

- **Access is token-free.** Fotmob's `/api/data/*` is Turnstile-gated (403), but the
  match/league pages serve full hydration via the Next.js `_next/data/{buildId}/…`
  SSR route with a plain GET (200). The buildId rotates per deploy and is discovered
  at runtime. Reading SSR hydration is not a CAPTCHA bypass.
- **It IS point-in-time valid.** Match xG is immutable once played (unlike
  Transfermarkt market values, which get overwritten), so scraping an old match page
  today yields a point-in-time-correct number.
- **The xG coverage wall is real and binding:** Fotmob xG (and its `situation` tags)
  ride on the *shotmap*, which exists for **2022 onward but NOT the 2018 World Cup**
  (2018 Fotmob shotmaps are empty). The gate scores held-out RPS on **both** 2018 and
  2022. An xG-based rating cannot be scored on the 2018 fold → **fails filter (1)** →
  xG itself is not gateable, from any source we have found (Fotmob *or* Sofascore — see
  below).

### Sofascore (via ScraperFC) — checked 2026-06; partially breaks the wall

`pip install ScraperFC` exposes a clean Sofascore API (`get_match_dicts`,
`scrape_match_shots`, `scrape_team_match_stats`). Understat is club-only (top-5 + RPL,
no internationals) → irrelevant. Sofascore carries FIFA World Cup back to 1930.
Findings:

- **xG: 2022 shots have `xg`+`xgot`; 2018 shots do NOT.** Same wall as Fotmob — no
  source carries 2018 World Cup xG, so xG stays ungated/display.
- **BUT 2018 shots DO carry `situation` + `goalType`** (Fotmob's 2018 shotmaps were
  empty; Sofascore's are not). So set-piece-goal rate and counter-attack-goal rate
  *can* be built point-in-time for **both** 2018 and 2022. **This upgrades set-piece
  proficiency and counter-attack reliance from "ungated" to GATEABLE.**
- **2018 team stats** also carry `Shots on target`, `Big chances`, `Big chances
  scored/missed` — confirming the shot-quality surrogates are available for both folds.
- Coverage is narrow (FIFA WC, Euro, Gold Cup, club leagues — NOT Copa/AFCON/Asian
  Cup/qualifiers/Nations League), so Sofascore is the **gate/backtest** source, while
  **Fotmob stays the broad display feed**. For the gate (an offline manual backtest)
  Sofascore's anti-bot fragility doesn't matter; it would only matter if a feature
  passes and needs a live daily source.

### GATE RESULT (2026-06) — xG and friends DROP. The gate held.

The route above was built and run. **StatsBomb open data** (`refdata/statsbomb_xg.json`,
built by `sb_ingest`) carries free provider xG + freeze-frames for WC2018, WC2022,
Euro2020, Euro2024, Copa2024, AFCON2023 — including 2018 (the fold no other source
covered). `exp_xg_gate.py` runs the travel-style two-stage gate: per-team decayed
xG-net rating as a covariate on top of the goals-based Dixon-Coles, β fit leave-one-
tournament-out, scored on held-out RPS. Verdict over 6 tournaments (296 matches):

| Covariate | held-out skill, goals-only | + covariate | delta | verdict |
|---|---|---|---|---|
| xG net | +14.4% | +14.4% | **−0.05 pts** | DROP |
| Big chances | +14.4% | +14.3% | −0.09 pts | DROP |
| Through balls | +14.4% | +13.8% | −0.61 pts | DROP |

β is small, positive and **sign-stable** across all tournaments (xG carries *real*
information), but it does **not improve held-out prediction** — it helps in three
tournaments, hurts in two, nets to zero. The Dixon-Coles attack/defence parameters,
fit on the full international history, already contain what xG knows. This is the
textbook "priced in by decay / results dominate" outcome, now *measured*, not
asserted. (WC2018 abstained 0/64 — StatsBomb free has no pre-2018 history; the
`exp_xg` home-grown coord-xG could rate 2018, but a −0.05 pt wash on the five
tournaments with data will not flip.)

**Net: xG is DROP for the model, KEEP for display.** It stays the ungated Fotmob
team-profile feed (`export_profiles.py`); it does not enter `sim.py`. The home-grown
xG model (`exp_xg.py`, AUC 0.807) and the StatsBomb corpus are retained as validated
research assets. The single biggest accuracy lever remains the daily refit on real
results.

What we measured (2022 WC + Euro 2024 + Copa 2024, 106 matches), correlation of each
team metric with the match's goal margin:

| Metric | r vs goal-margin | Verdict |
|---|---|---|
| xG on target (xGOT) | 0.74 | strongest — but no 2018 → ungated |
| xG, shots on target, big chances | 0.51–0.55 | strong shot-quality family |
| shots inside box / touches in box | 0.34–0.40 | dangerous-territory volume |
| possession, passing, dribbles | 0.11–0.19 | ~noise — confirms "possession barely matters" |
| tackles, interceptions, clearances | −0.11 to 0.08 | possession-confounded anti-signal |

Set-piece share of tournament goals: **~19% set piece + 10.5% penalty ≈ 30% dead
ball** — big, but set-piece xG per match does *not* separate the winner (r≈0.01); it's
a low-variance, league-wide constant. Set-piece *proficiency* is a team trait that
varies a lot, but rides the shotmap → ungated.

**Decision: ship as an ungated display feed, not a model input.**
`export_profiles.py` pulls per-team Fotmob xG + goal-situation over the current
coach's tenure (recent-window fallback when a coach is too new; recency half-life
365d), caches by immutable matchId in `refdata/fotmob_xg_cache.json` (so daily CI
only fetches new matches, token-free), and writes `exports/team_profiles.json`. Both
apps render it beside the model's pick, clearly labelled "not a model input." It
**never enters `sim.py`** — same firewall as `counter_reliance_2026.csv`.

The two gateable shot-quality metrics with 2018 coverage are **shots on target** and
**big chances** (these are stats, not shotmap-derived, so 2018 carries them). They are
the legitimate xG surrogates: if anyone builds a shots-on-target / big-chances team
rating, it CAN be backtested on 2018+2022 — that's the one xG-adjacent feature worth
sending through the gate. Not built yet.

**SkillCorner physical-output data** (tracking: distance, sprints, high-intensity)
was also assessed and **declined**: it uniquely *does* cover both 2018 and 2022, but
it's a paid commercial feed (fails filter 3, pipelineable) and its headline metric —
total distance — is an inverse-quality confound (better teams run less; semi-finalists
ran 150m less per game), the same DROP family as possession. It validates two existing
choices (travel-fatigue KEEP, rest/congestion DROP) but hands us no covariate.

## Outputs

| Output | Producer | Consumer |
|---|---|---|
| `agents/polymarket/exports/scores.json` | `export_scores.py` | `/wc26` + `wc.vdmnexus.com` per-fixture pick |
| `agents/polymarket/exports/tournament.json` | `export_tournament.py` | `/wc26` + `wc.vdmnexus.com` champion/advancement board |
| `agents/polymarket/exports/team_profiles.json` | `export_profiles.py` | `wc.vdmnexus.com` team page — **display only, not a model input** |
| `agents/polymarket/refdata/fotmob_xg_cache.json` | `export_profiles.py` | immutable matchId→xG cache (keeps daily CI cheap) |
| Supabase `football_matches`, `wc_standings` | `ingest.py` | data layer / future queries |
| Pool entry optimization | `pool_picks.py` | manual pool play |

## Refresh loop

A daily GitHub Action (`.github/workflows/football-ingest.yml`, 06:00 UTC)
re-ingests the martj42 feed, pins newly played 2026 group games, re-fits
ratings, regenerates both JSON snapshots, and commits them back. Requires
repo secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Real results
dominate any covariate, so this loop is the single largest accuracy gain
between now and the final.

The same action also refreshes the display-only Fotmob xG profiles
(`export_profiles.py`, `continue-on-error`). The committed immutable matchId
cache means it only fetches internationals played since the last run, so the
daily delta is tiny (zero on most days, a handful during FIFA windows) and
token-free. A Fotmob outage cannot block the prediction commit.
