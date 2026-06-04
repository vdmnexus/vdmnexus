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
| Coach metadata | coach covariate *(building)* | manual → commit `refdata/` | ⚠️ proxy only |
| Injury / availability | availability adjustment *(building)* | curated list → `refdata/` | ⚠️ hard, point-in-time |
| Fotmob team stats | — (rejected) | token-gated (Playwright) | ❌ |

## Feature registry

| Feature | exp file | Status | Beyond rating? |
|---|---|---|---|
| Base rating (attack/def/home) | `calibrate` | **CORE** | — |
| Host edge ×0.33 | `exp_host` | **LIVE** | venue |
| Squad talent (pool) β +0.016 | `exp_talent` | **LIVE** | ✅ "France blind spot" |
| Travel fatigue (km) β −0.07 | `exp_travel` | **LIVE** | within-tournament |
| Altitude | `exp_altitude` | DROPPED | failed gate |
| Rest / congestion | `exp_rest` | DROPPED | priced in by decay |
| Form / momentum | `exp_form` | DROPPED | priced in by decay |
| East-west travel | `exp_travel_ew` | PENDING (un-run) | refinement of travel |
| **Roster talent** | *(planned)* | **COMMITTED — build** | ✅ sharpens talent |
| **Coach quality** | *(planned)* | **COMMITTED — build** | weak prior |
| **Injuries / availability** | *(planned)* | **COMMITTED — build** | ✅ but data is hard |

## Committed build order

1. **Roster talent** — restrict the talent pool to the actual announced
   26-man squads (2018 / 2022 / 2026). Backtest roster-talent vs pool-talent
   on the held-out RPS; promote only if it wins. Clears all three filters;
   sharpens the one covariate that already passed the gate. 2026 squads lock
   ~early June for the June 11 opener.
2. **Coach quality** — build a point-in-time coach proxy (career win-rate /
   prior-tournament Elo of teams managed), snapshot for 2018/22, gate it.
   Weak prior — likely DROP, same trap as form/rest. Let the gate decide.
3. **Injuries / availability** — curated point-in-time "key player out" list
   feeding a talent adjustment. Highest ceiling, hardest data. Must clear the
   gate or it doesn't ship.

Not committed: **east-west travel** stays a pending un-run experiment
(`exp_travel_ew`) — one run settles KEEP/DROP. **Fotmob** is designed out: it
can't be point-in-time'd, is redundant with the Dixon-Coles attack/defence
parameters, and is token-gated so it can't be pipelined.

## Outputs

| Output | Producer | Consumer |
|---|---|---|
| `agents/polymarket/exports/scores.json` | `export_scores.py` | `/wc26` + `wc.vdmnexus.com` per-fixture pick |
| `agents/polymarket/exports/tournament.json` | `export_tournament.py` | `/wc26` + `wc.vdmnexus.com` champion/advancement board |
| Supabase `football_matches`, `wc_standings` | `ingest.py` | data layer / future queries |
| Pool entry optimization | `pool_picks.py` | manual pool play |

## Refresh loop

A daily GitHub Action (`.github/workflows/football-ingest.yml`, 06:00 UTC)
re-ingests the martj42 feed, pins newly played 2026 group games, re-fits
ratings, regenerates both JSON snapshots, and commits them back. Requires
repo secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Real results
dominate any covariate, so this loop is the single largest accuracy gain
between now and the final.
