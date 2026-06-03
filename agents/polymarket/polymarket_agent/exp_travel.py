"""Experiment #7 — travel fatigue as a within-tournament fatigue covariate.

The user has pushed travel four times (sports-med review, ESPN logistics
piece, two distance charts, a 2014 base-camp table, the Clements travel
paper). The honest move is to GATE it, not keep asserting it's "absorbed."

Why travel is structurally different from talent (#5) and altitude (#6):
those are properties a team carries into every match, so their beta can be
fit on the full 49k-international history. Travel fatigue only EXISTS inside
a multi-venue tournament — a team that zig-zagged South Africa is tired
relative to one that camped in Jo'burg, but two friendlies played in two
countries carry no such within-event differential. So a travel beta cannot
be fit from general internationals. It has to be fit from prior World Cups.

Design — two-stage, leave-one-WC-out (no test-set tuning):
  * travel(team, match) = cumulative great-circle distance (km) the team has
    flown between consecutive venue cities, in date order, UP TO AND INCLUDING
    the leg into this match. First match of the tournament = 0 (we don't know
    historical base camps). Scaled by /1000 so the differential is O(1).
  * Differential covariate, same encoding as #5/#6:
        eta_home += beta * (travel_home - travel_away)
        eta_away -= beta * (travel_home - travel_away)
    A tired team should score LESS, so the mechanism predicts beta < 0.
  * STAGE 1: fit attack/defence/intercept/home_adv with the standard
    fit_ratings on ALL data strictly before the target WC opener.
  * STAGE 2: holding those strengths FIXED, fit the single scalar beta by
    Poisson MLE on the POOLED matches of all PRIOR geocoded WCs (the only
    matches where a travel differential exists). This is the leave-one-out:
    2018 gets beta from 2010+2014; 2014 gets beta from 2010; 2010 has no
    prior multi-venue WC in the geocoded set and is skipped as a target.
  * Score the held-out target WC's RPS skill vs climatology, baseline
    (strengths only) vs strengths+travel.
  * 2022 Qatar is a degenerate gate (all five venues within ~25 km of Doha;
    cumulative travel ~0 for everyone) so the differential is ~0 and it can
    only tie baseline — reported but not load-bearing.

Run:  python3 -m polymarket_agent.exp_travel
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

import numpy as np
from scipy.optimize import minimize_scalar

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .backtest_wc import _outcome, _rps
from .model import ScorelineModel

# Geocoded venue cities (lat, lon) keyed by the EXACT results.csv city string.
VENUE_LATLON: dict[str, tuple[float, float]] = {
    # 2010 South Africa
    "Johannesburg": (-26.2041, 28.0473),
    "Cape Town": (-33.9249, 18.4241),
    "Durban": (-29.8587, 31.0218),
    "Pretoria": (-25.7479, 28.2293),
    "Port Elizabeth": (-33.9608, 25.6022),
    "Bloemfontein": (-29.0852, 26.1596),
    "Polokwane": (-23.9045, 29.4689),
    "Nelspruit": (-25.4753, 30.9694),
    "Rustenburg": (-25.6672, 27.2424),
    # 2014 Brazil
    "Rio de Janeiro": (-22.9068, -43.1729),
    "São Paulo": (-23.5505, -46.6333),
    "Brasília": (-15.7939, -47.8828),
    "Salvador": (-12.9777, -38.5016),
    "Fortaleza": (-3.7172, -38.5433),
    "Belo Horizonte": (-19.9167, -43.9345),
    "Porto Alegre": (-30.0346, -51.2177),
    "Recife": (-8.0476, -34.8770),
    "Cuiabá": (-15.6014, -56.0979),
    "Manaus": (-3.1190, -60.0217),
    "Natal": (-5.7945, -35.2110),
    "Curitiba": (-25.4284, -49.2733),
    # 2018 Russia
    "Moscow": (55.7558, 37.6173),
    "Saint Petersburg": (59.9311, 30.3609),
    "Sochi": (43.6028, 39.7342),
    "Kazan": (55.8304, 49.0661),
    "Nizhny Novgorod": (56.2965, 43.9361),
    "Samara": (53.1959, 50.1002),
    "Rostov-on-Don": (47.2357, 39.7015),
    "Kaliningrad": (54.7104, 20.4522),
    "Volgograd": (48.7080, 44.5133),
    "Ekaterinburg": (56.8389, 60.6057),
    "Saransk": (54.1838, 45.1749),
    # 2022 Qatar (all within ~25 km of Doha)
    "Doha": (25.2854, 51.5310),
    "Al Khor": (25.6804, 51.4969),
    "Al Rayyan": (25.2919, 51.4244),
    "Al Wakrah": (25.1659, 51.5995),
    "Lusail": (25.4209, 51.4912),
    # 2026 USA / Mexico / Canada — keyed by the FIFA host-city label, geocoded
    # to the actual match stadium (travel legs are inter-city, so stadium vs
    # downtown is immaterial; the suburb stadiums just keep the leg honest).
    "Vancouver": (49.2768, -123.1120),            # BC Place
    "Seattle": (47.5952, -122.3316),              # Lumen Field
    "San Francisco Bay Area": (37.4030, -121.9700),  # Levi's, Santa Clara
    "Los Angeles": (33.9535, -118.3392),          # SoFi, Inglewood
    "Guadalajara": (20.6819, -103.4626),          # Estadio Akron
    "Mexico City": (19.3029, -99.1505),           # Estadio Azteca
    "Monterrey": (25.6692, -100.2447),            # Estadio BBVA, Guadalupe
    "Houston": (29.6847, -95.4107),               # NRG Stadium
    "Dallas": (32.7473, -97.0945),                # AT&T, Arlington
    "Kansas City": (39.0489, -94.4839),           # Arrowhead
    "Atlanta": (33.7553, -84.4006),               # Mercedes-Benz
    "Miami": (25.9580, -80.2389),                 # Hard Rock, Miami Gardens
    "Toronto": (43.6332, -79.4185),               # BMO Field
    "Boston": (42.0909, -71.2643),                # Gillette, Foxborough
    "Philadelphia": (39.9008, -75.1675),          # Lincoln Financial
    "New York New Jersey": (40.8135, -74.0745),   # MetLife, East Rutherford
}

# WC opener/closer windows for the geocoded tournaments.
WC_WINDOWS = {
    2010: (date(2010, 6, 11), date(2010, 7, 11)),
    2014: (date(2014, 6, 12), date(2014, 7, 13)),
    2018: (date(2018, 6, 14), date(2018, 7, 15)),
    2022: (date(2022, 11, 20), date(2022, 12, 18)),
}


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def load_city_map() -> dict[tuple[str, str, str], str]:
    """(date_iso, home, away) -> venue city, straight from results.csv."""
    import csv
    from .calibrate import DATA_DIR
    cities: dict[tuple[str, str, str], str] = {}
    with open(DATA_DIR / "results.csv", newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            cities[(r["date"], r["home_team"], r["away_team"])] = r["city"]
    return cities


def city_of(m, cities) -> str | None:
    return cities.get((m.d.isoformat(), m.home, m.away))


def compute_travel(matches, year, cities) -> dict[int, tuple[float, float]]:
    """id(match) -> (cum_km_home, cum_km_away) within the `year` WC, /1000.

    Cumulative great-circle distance each team has flown between consecutive
    venue cities in date order. First appearance = 0 (unknown base camp).
    """
    start, end = WC_WINDOWS[year]
    games = sorted((m for m in matches
                    if start <= m.d <= end and m.tournament == "FIFA World Cup"),
                   key=lambda x: (x.d, x.home))
    last_city: dict[str, str] = {}
    cum: dict[str, float] = {}
    out: dict[int, tuple[float, float]] = {}
    for m in games:
        c = city_of(m, cities)
        ll = VENUE_LATLON.get(c) if c else None
        for team in (m.home, m.away):
            if ll is not None and team in last_city and last_city[team] in VENUE_LATLON:
                cum[team] = cum.get(team, 0.0) + haversine_km(
                    VENUE_LATLON[last_city[team]], ll)
            if ll is not None:
                last_city[team] = c
        out[id(m)] = (cum.get(m.home, 0.0) / 1000.0, cum.get(m.away, 0.0) / 1000.0)
    return out


@dataclass
class FixedStrengths:
    base: object  # a fit_ratings result with .lambdas / .index / fields

    def eta0(self, home, away, neutral):
        lm = self.base.lambdas(home, away, neutral=neutral)
        if lm is None:
            return None
        lam_h, lam_a = lm
        return math.log(lam_h), math.log(lam_a)


def fit_beta_on_pool(base, pool_matches, travel) -> float:
    """1-D Poisson MLE for scalar beta with strengths held fixed.

    pool_matches: list of (match, neutral_flag) from prior WCs.
    """
    rows = []  # (eta_h0, eta_a0, hs, aws, td)
    for m in pool_matches:
        lm = base.lambdas(m.home, m.away, neutral=True)  # WC games are neutral
        if lm is None:
            continue
        td = travel[id(m)][0] - travel[id(m)][1]
        rows.append((math.log(lm[0]), math.log(lm[1]),
                     float(m.hs), float(m.aws), td))
    if not rows:
        return 0.0
    eh0 = np.array([r[0] for r in rows])
    ea0 = np.array([r[1] for r in rows])
    hs = np.array([r[2] for r in rows])
    aws = np.array([r[3] for r in rows])
    td = np.array([r[4] for r in rows])

    def nll(beta):
        eta_h = eh0 + beta * td
        eta_a = ea0 - beta * td
        return -(hs * eta_h - np.exp(eta_h) + aws * eta_a - np.exp(eta_a)).sum()

    res = minimize_scalar(nll, bounds=(-2.0, 2.0), method="bounded")
    return float(res.x)


def lambdas_travel(base, home, away, beta, td):
    lm = base.lambdas(home, away, neutral=True)
    if lm is None:
        return None
    lam = lm[0] * math.exp(beta * td)
    mu = lm[1] * math.exp(-beta * td)
    return lam, mu


def backtest_target(matches, target, prior_years, cities):
    start, end = WC_WINDOWS[target]
    train = [m for m in matches if m.d < start]
    eligible = fifa_member_teams(matches, since=date(target - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)

    # STAGE 2: fit beta on pooled prior-WC matches (strengths fixed).
    pool = []
    pool_travel: dict[int, tuple[float, float]] = {}
    for py in prior_years:
        ps, pe = WC_WINDOWS[py]
        tv = compute_travel(matches, py, cities)
        for m in matches:
            if ps <= m.d <= pe and m.tournament == "FIFA World Cup":
                pool.append(m)
                pool_travel[id(m)] = tv[id(m)]
    beta = fit_beta_on_pool(base, pool, pool_travel)

    # Score held-out target WC.
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    travel = compute_travel(matches, target, cities)
    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()

    rps_base = rps_tr = rps_clim = 0.0
    n = moved = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        lb = base.lambdas(m.home, m.away, neutral=True)
        if lb is None:
            continue
        td = travel[id(m)][0] - travel[id(m)][1]
        lt = lambdas_travel(base, m.home, m.away, beta, td)
        pb = ScorelineModel(*lb).match_result()
        pt = ScorelineModel(*lt).match_result()
        rps_base += _rps(np.array([pb["home"], pb["draw"], pb["away"]]), out)
        rps_tr += _rps(np.array([pt["home"], pt["draw"], pt["away"]]), out)
        rps_clim += _rps(clim, out)
        n += 1
        moved += int(abs(td) > 1e-9)
    return {"target": target, "beta": beta, "n": n, "moved": moved,
            "rps_base": rps_base, "rps_tr": rps_tr, "rps_clim": rps_clim}


def _main():
    matches = load_results()
    cities = load_city_map()
    print(f"loaded {len(matches):,} internationals\n")
    print("Experiment #7 — within-tournament travel-fatigue differential.")
    print("beta<0 => the team that has flown more scores less (fatigue).")
    print("Two-stage: strengths on full history, beta on PRIOR WCs only.\n")

    # leave-one-WC-out: target -> geocoded WCs strictly before it.
    plans = [
        (2014, [2010]),
        (2018, [2010, 2014]),
        (2022, [2010, 2014, 2018]),
    ]
    agg = {"b": 0.0, "t": 0.0, "c": 0.0, "n": 0, "moved": 0}
    for target, prior in plans:
        r = backtest_target(matches, target, prior, cities)
        sb = 1 - r["rps_base"] / r["rps_clim"]
        st = 1 - r["rps_tr"] / r["rps_clim"]
        verdict = "KEEP" if st > sb + 1e-9 else "DROP"
        print(f"  {target} (beta from {prior})  beta {r['beta']:+.4f}  "
              f"moved {r['moved']}/{r['n']}  "
              f"skill {sb*100:+.1f}% -> {st*100:+.1f}%  "
              f"({(st-sb)*100:+.2f} pts) [{verdict}]")
        agg["b"] += r["rps_base"]; agg["t"] += r["rps_tr"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]; agg["moved"] += r["moved"]
    sb = 1 - agg["b"] / agg["c"]
    st = 1 - agg["t"] / agg["c"]
    verdict = "KEEP" if st > sb + 1e-9 else "DROP"
    print(f"\n  COMBINED  moved {agg['moved']}/{agg['n']}  "
          f"skill {sb*100:+.1f}% -> {st*100:+.1f}%  "
          f"({(st-sb)*100:+.2f} pts) [{verdict}]")


if __name__ == "__main__":
    _main()
