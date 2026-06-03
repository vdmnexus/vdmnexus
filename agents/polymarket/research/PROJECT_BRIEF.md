# PROJECT: World Cup 2026 match-prediction model — full feature build + 2010/2014 backtest

**Status:** VDM Nexus parked. This is the active project.

## Why 2010 + 2014 specifically

The honesty gate only works if the held-out tournament can *see* the feature
under test. Our prior hold-outs are blind to the two features that matter most
for 2026:

- **2018 Russia** — sea-level venues; altitude differential ≈ 0.
- **2022 Qatar** — five venues within ~25 km of Doha; cumulative travel ≈ 0
  for every team. A degenerate gate for travel.
- **2010 South Africa** — real altitude spread (Johannesburg/Pretoria ~1700 m
  vs coastal Cape Town/Durban at sea level). The only WC in the dataset where
  the altitude differential is load-bearing.
- **2014 Brazil** — ~7,000 mi flown per team across a continent-sized country;
  the largest within-tournament travel load on record. The travel gate's
  signal cup.

2026 (USA/Mexico/Canada) has BOTH: Mexico City altitude + transcontinental
travel. So 2010 and 2014 are the only honest proving grounds for the 2026
covariates.

## Established methodology (do not relitigate)

- **Core:** time-weighted Dixon-Coles / Maher Poisson. Per-team attack/defence,
  global home_adv (zeroed at neutral), 540-day half-life decay, match-importance
  weighting, ridge=0.05.
- **Honesty gate:** out-of-sample RPS skill vs climatology on held-out WCs.
  Fit strictly BEFORE each opener (no lookahead). KEEP a feature only if
  held-out RPS improves. Sign-stability of the coefficient across tournaments
  is the signal-vs-noise discriminator.
- **Differential encoding:** `eta_home += beta*(x_home − x_away)`,
  `eta_away −= same`. Fit beta JOINTLY with attack/defence (L-BFGS-B, analytic
  gradient) for full-history features; two-stage (strengths on full history,
  beta on prior WCs only) for within-tournament features like travel.
- **Robberechts caution:** stacking a second strength signal onto a good rating
  can DEGRADE out-of-sample RPS (their ELO+ODM lost to ELO alone). Re-gate the
  COMBINED model — never assume features are additive.

## Current state

- Baseline RPS skill vs climatology: **+11.7%** (2018+2022 hold-out).
- KEEP: #2 host edge, #5 squad talent (beta +0.016), #6 altitude (beta +0.13),
  #7 travel (beta −0.07).
- DROP: #1 rest days, #4 recent form.
- PARK: #3 market value.

## Tasks in order

1. **Extend `backtest_wc.py`** to add 2010 + 2014 as held-out WCs. Report
   per-cup and combined RPS skill / Brier / accuracy. Windows + venue geocodes
   already exist in `exp_travel.py` (`WC_WINDOWS`, `VENUE_LATLON`).
2. **Re-gate all KEEP features** on the expanded 4-cup hold-out. Check
   sign-stability of every beta across 2010/2014/2018/2022.
3. **Re-gate the COMBINED model** (host + talent + altitude + travel together)
   on the expanded hold-out. THIS IS THE MOST IMPORTANT LINE — the gate, not
   intuition, decides whether the stack survives.
4. **Hunt new gateable features.** Top candidate: pre-match xG team-strength
   rating from StatsBomb open data.
5. **Acquire FIFA 26 ratings** + enter the 2026 venue schedule to activate the
   travel covariate for the live model.

## Data inventory

- `.data/results.csv` — 49,296 internationals (home/away/score/date/city/tournament)
- `.data/goalscorers.csv`
- `.data/fifa18_players.csv`, `.data/fifa22_players.csv`
- NOT present: FIFA24/25/26 ratings, StatsBomb xG, 2026 venue schedule.

## File map

- `polymarket_agent/calibrate.py` — `load_results`, `fit_ratings`, `fifa_member_teams`
- `polymarket_agent/model.py` — `ScorelineModel`, value helpers
- `polymarket_agent/backtest_wc.py` — the honesty gate (Task 1 extends this)
- `polymarket_agent/exp_travel.py` — travel gate, `VENUE_LATLON`, `WC_WINDOWS`
- `polymarket_agent/exp_altitude.py` — altitude gate
- `polymarket_agent/exp_talent.py` — talent gate
- `polymarket_agent/sim.py` — 2026 champion Monte Carlo (gated Engine)
- `polymarket_agent/pool_picks.py` — exact-scoreline pool pick sheet
- `research/EXPERIMENTS.md` — running lab notebook (source of gated coefficients)

## Guardrail

The gate decides, not intuition. A feature with a plausible mechanism that
fails to improve held-out RPS — or whose beta flips sign across cups — is
noise and gets DROPPED, no matter how good the story is.
