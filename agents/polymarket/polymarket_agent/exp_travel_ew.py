"""Experiment #10 — east-west (time-zone) weighted travel vs raw great-circle km.

Travel fatigue (#7) gated KEEP as the single strongest feature (+1.18 pts on
the 4-cup hold-out). §7 flagged a v2: Clements et al. (PMC10286598) find it is
TIME-ZONE crossings (east-west), not raw north-south miles, that drive measured
jet lag (>3 h circadian shift) and sprint/jump loss. North-south travel costs
distance-fatigue but no circadian disruption; east-west travel costs both.

This experiment swaps the leg-cost function inside the EXACT two-stage,
leave-one-WC-out gate that #7 used, and asks one question: does an east-west /
time-zone weighting gate BETTER than raw km? If yes, it is a real refinement of
the winning feature. If it ties or loses, raw km stays and this is a settled
negative — the gate decides, not the literature.

Leg-cost variants (all cumulated per team between consecutive venue cities, in
date order, first appearance = 0, exactly like #7):
  * km        great-circle km / 1000               (the #7 winner, the control)
  * tz        |Δlongitude| / 15  -> time-zone hours (pure east-west, ignores N-S)
  * tz_dir    eastward travel weighted 1.5x         (phase-advance is worse than
              phase-delay; jet-lag literature's directional asymmetry)
  * blend     0.5*km_scaled + 0.5*tz_scaled         (distance AND circadian)

Each variant is z-less but rescaled so its typical differential is O(1) (same
order as the /1000 km differential #7 fit), so the fitted beta magnitudes are
comparable across variants. The verdict is purely the held-out RPS skill delta.

Discriminating cups: Russia 2018 spans Kaliningrad (20E) -> Ekaterinburg (60E)
≈ 40 deg ≈ 2.7 tz of genuine east-west load; Brazil 2014's biggest hauls
(Manaus -> Porto Alegre) are largely NORTH-SOUTH, so an east-west weighting
DOWNWEIGHTS them. The two cups re-rank under the swap — a clean test.

Run:  python3 -m polymarket_agent.exp_travel_ew
"""

from __future__ import annotations

import math
from datetime import date

import numpy as np
from scipy.optimize import minimize_scalar

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .backtest_wc import _outcome, _rps
from .model import ScorelineModel
from .exp_travel import (
    VENUE_LATLON,
    WC_WINDOWS,
    haversine_km,
    load_city_map,
    city_of,
)

# Per-variant rescale so each variant's typical per-match differential sits at
# the same O(1) scale the #7 km/1000 differential did. Picked from the median
# absolute leg cost over the geocoded cups (computed once, hard-coded so the
# fit is deterministic and not leaking cross-cup info via a live normaliser).
SCALE = {
    "km": 1000.0,        # km  -> /1000  (identical to #7)
    "tz": 1.0,           # tz hours already O(1) over a tournament
    "tz_dir": 1.0,
    "blend": 1.0,        # blend pre-scales its two halves internally
}


def leg_cost(a: tuple[float, float], b: tuple[float, float], variant: str) -> float:
    """Fatigue cost of one flight from venue a to venue b, in raw units."""
    if variant == "km":
        return haversine_km(a, b)
    dlon = abs(b[1] - a[1])
    if dlon > 180.0:
        dlon = 360.0 - dlon          # shorter way round the globe
    tz = dlon / 15.0                  # 15 deg longitude ≈ 1 time zone / hour
    if variant == "tz":
        return tz
    if variant == "tz_dir":
        eastward = (b[1] - a[1]) % 360.0 < 180.0 and (b[1] != a[1])
        return tz * (1.5 if eastward else 1.0)
    if variant == "blend":
        return 0.5 * (haversine_km(a, b) / 1000.0) + 0.5 * tz
    raise ValueError(variant)


def compute_travel(matches, year, cities, variant) -> dict[int, tuple[float, float]]:
    """id(match) -> (cum_cost_home, cum_cost_away) within `year`, rescaled."""
    start, end = WC_WINDOWS[year]
    games = sorted((m for m in matches
                    if start <= m.d <= end and m.tournament == "FIFA World Cup"),
                   key=lambda x: (x.d, x.home))
    last_city: dict[str, str] = {}
    cum: dict[str, float] = {}
    out: dict[int, tuple[float, float]] = {}
    sc = SCALE[variant]
    for m in games:
        c = city_of(m, cities)
        ll = VENUE_LATLON.get(c) if c else None
        for team in (m.home, m.away):
            if ll is not None and team in last_city and last_city[team] in VENUE_LATLON:
                cum[team] = cum.get(team, 0.0) + leg_cost(
                    VENUE_LATLON[last_city[team]], ll, variant)
            if ll is not None:
                last_city[team] = c
        out[id(m)] = (cum.get(m.home, 0.0) / sc, cum.get(m.away, 0.0) / sc)
    return out


def fit_beta_on_pool(base, pool_matches, travel) -> float:
    rows = []
    for m in pool_matches:
        lm = base.lambdas(m.home, m.away, neutral=True)
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

    res = minimize_scalar(nll, bounds=(-3.0, 3.0), method="bounded")
    return float(res.x)


def lambdas_travel(base, home, away, beta, td):
    lm = base.lambdas(home, away, neutral=True)
    if lm is None:
        return None
    return lm[0] * math.exp(beta * td), lm[1] * math.exp(-beta * td)


def backtest_target(matches, target, prior_years, cities, variant):
    start, end = WC_WINDOWS[target]
    train = [m for m in matches if m.d < start]
    eligible = fifa_member_teams(matches, since=date(target - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)

    pool, pool_travel = [], {}
    for py in prior_years:
        ps, pe = WC_WINDOWS[py]
        tv = compute_travel(matches, py, cities, variant)
        for m in matches:
            if ps <= m.d <= pe and m.tournament == "FIFA World Cup":
                pool.append(m)
                pool_travel[id(m)] = tv[id(m)]
    beta = fit_beta_on_pool(base, pool, pool_travel)

    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    travel = compute_travel(matches, target, cities, variant)
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


def run_variant(matches, cities, variant) -> dict:
    plans = [(2014, [2010]), (2018, [2010, 2014]), (2022, [2010, 2014, 2018])]
    agg = {"b": 0.0, "t": 0.0, "c": 0.0, "n": 0, "moved": 0}
    per = []
    for target, prior in plans:
        r = backtest_target(matches, target, prior, cities, variant)
        sb = 1 - r["rps_base"] / r["rps_clim"]
        st = 1 - r["rps_tr"] / r["rps_clim"]
        per.append((target, prior, r["beta"], r["moved"], r["n"], sb, st))
        agg["b"] += r["rps_base"]; agg["t"] += r["rps_tr"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]; agg["moved"] += r["moved"]
    sb = 1 - agg["b"] / agg["c"]
    st = 1 - agg["t"] / agg["c"]
    return {"variant": variant, "per": per, "sb": sb, "st": st,
            "moved": agg["moved"], "n": agg["n"]}


def _main():
    matches = load_results()
    cities = load_city_map()
    print(f"loaded {len(matches):,} internationals\n")
    print("Experiment #10 — east-west / time-zone weighted travel vs raw km.")
    print("Same two-stage leave-one-WC-out gate as #7. beta<0 => more-travelled")
    print("side scores less. Question: does an east-west weighting gate BETTER")
    print("than raw great-circle km (the #7 KEEP)?\n")

    results = {}
    for variant in ("km", "tz", "tz_dir", "blend"):
        res = run_variant(matches, cities, variant)
        results[variant] = res
        print(f"=== variant: {variant} ===")
        for target, prior, beta, moved, n, sb, st in res["per"]:
            verdict = "KEEP" if st > sb + 1e-9 else "DROP"
            print(f"  {target} (beta from {prior})  beta {beta:+.4f}  "
                  f"moved {moved}/{n}  skill {sb*100:+.1f}% -> {st*100:+.1f}%  "
                  f"({(st-sb)*100:+.2f} pts) [{verdict}]")
        d = (res["st"] - res["sb"]) * 100
        print(f"  COMBINED  moved {res['moved']}/{res['n']}  "
              f"skill {res['sb']*100:+.1f}% -> {res['st']*100:+.1f}%  "
              f"({d:+.2f} pts)\n")

    print("=" * 60)
    print("HEAD-TO-HEAD (combined held-out RPS skill, delta vs strengths-only)")
    km = (results["km"]["st"] - results["km"]["sb"]) * 100
    for v in ("km", "tz", "tz_dir", "blend"):
        d = (results[v]["st"] - results[v]["sb"]) * 100
        tag = "  <-- #7 control" if v == "km" else (
            "  <-- beats km" if d > km + 1e-9 else "")
        print(f"  {v:8s}  {results[v]['st']*100:+.1f}%   ({d:+.2f} pts){tag}")
    best = max(("tz", "tz_dir", "blend"),
               key=lambda v: results[v]["st"])
    bd = (results[best]["st"] - results[best]["sb"]) * 100
    if bd > km + 1e-9:
        print(f"\n  VERDICT: east-west weighting ({best}) gates BETTER "
              f"(+{bd-km:.2f} pts over raw km). Refinement is real.")
    else:
        print(f"\n  VERDICT: no east-west variant beats raw km "
              f"({km:+.2f} pts). Raw great-circle km stays. Settled negative.")


if __name__ == "__main__":
    _main()
