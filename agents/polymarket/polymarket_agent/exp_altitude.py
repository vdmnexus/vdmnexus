"""Experiment #6 — altitude (ascent-penalty) as a strength covariate.

The 2026 FWC plays 9 matches at moderate altitude in Mexico (Guadalajara
1566 m, Mexico City 2240 m). The sports-medicine literature gives a large,
quantified outcome effect — McSharry (2007, BMJ; 1,460 South American
internationals) finds roughly a HALF-GOAL advantage per 1000 m of altitude
difference, and the 2010 FWC saw altitude-based teams roughly double their
win chance in highveld matches. Altitude is a VENUE factor — genuinely new
information the score-only rating can't derive from past results, the same
category as host advantage (#2) and squad talent (#5), the two features that
survived the honesty gate. Rest (#1) and form (#4) died because they are
downstream of results; altitude is not.

THE GATE IS DIFFERENT. Our usual hold-out (2018 Russia + 2022 Qatar) is BLIND
to altitude — both were played at sea level, zero altitude variation. So we
cannot gate altitude there. Instead we gate on World Cups that actually had
altitude variation:
  * 2010 South Africa — the prize gate: a NEUTRAL tournament with a clean
    highveld/sea-level split (Johannesburg 1750 m ... Cape Town 0 m). Same
    competition type as 2026.
  * 1986 Mexico — mostly high (Mexico City 2240, Toluca 2660) with Monterrey
    (540) as the low contrast.
  * 1970 Mexico — all high (no sea-level contrast; weak as a gate, included
    for the altitude-adapted angle).
McSharry's original CONMEBOL-qualifier signal (La Paz 3640, Quito 2850) also
feeds the fit through the full training history.

Mechanism at a NEUTRAL venue is altitude-ADAPTATION, not home advantage: a
sea-level team forced to play high is impaired; an altitude-adapted team is
not. So each team carries an ASCENT PENALTY = how far the venue sits above
its home altitude (descending doesn't help, so it's one-sided):

    penalty(team) = max(0, venue_alt - home_alt(team)) / 1000
    eta_home += beta * (penalty_away - penalty_home)     # beta > 0
    eta_away -= beta * (penalty_away - penalty_home)

beta>0 means the less-penalised (better-adapted) side scores more. Unlike
talent (#5) there is NO time window — altitude is permanent geography, every
training match with a known high venue contributes. Fit beta JOINTLY with
attack/defence on data strictly BEFORE each gate tournament, then score the
held-out World Cup vs the no-altitude baseline. Sanity-check the fitted
magnitude against McSharry's ~0.5 goal / 1000 m.

Run:  python -m polymarket_agent.exp_altitude
"""

from __future__ import annotations

import csv
import math
from dataclasses import dataclass
from datetime import date

import numpy as np
from scipy.optimize import minimize

from .calibrate import (
    DATA_DIR, _importance, fifa_member_teams, fit_ratings, load_results,
)
from .backtest_wc import _outcome, _rps
from .model import ScorelineModel

# World Cups with altitude variation (start, end, host). Distinct from the
# 2018/2022 gate in backtest_wc.py, which is blind to altitude.
ALT_TOURNAMENTS = {
    1970: (date(1970, 5, 31), date(1970, 6, 21), "Mexico"),
    1986: (date(1986, 5, 31), date(1986, 6, 29), "Mexico"),
    2010: (date(2010, 6, 11), date(2010, 7, 11), "South Africa"),
}

# Venue altitude (metres). Default 0 (sea level) for any city not listed —
# the ascent penalty is only non-zero at genuinely high venues, so only the
# high cities need mapping. Covers the 3 gate tournaments + the major
# high-altitude qualifier venues that drive the training signal + 2026 Mexico.
VENUE_ALT = {
    # 2010 South Africa
    "Johannesburg": 1753, "Pretoria": 1339, "Rustenburg": 1500,
    "Bloemfontein": 1395, "Polokwane": 1310, "Nelspruit": 660,
    "Cape Town": 0, "Durban": 8, "Port Elizabeth": 60,
    # Mexico (1970 / 1986 / 2026)
    "Mexico City": 2240, "Toluca": 2660, "Puebla": 2135, "Querétaro": 1820,
    "Guadalajara": 1566, "León": 1815, "Irapuato": 1730,
    "Nezahualcóyotl": 2220, "Monterrey": 540, "Pachuca": 2432,
    # Andean CONMEBOL qualifier venues (McSharry's signal)
    "La Paz": 3640, "Oruro": 3700, "Cochabamba": 2558, "Santa Cruz": 416,
    "Quito": 2850, "Cuenca": 2560, "Ambato": 2577,
    "Bogotá": 2640, "Barranquilla": 18, "Pasto": 2527, "Tunja": 2820,
    "Caracas": 900, "Lima": 154, "Asunción": 43, "Santiago": 520,
    "Montevideo": 43,
    # CONCACAF / other notable highland venues
    "San José": 1170, "Guatemala City": 1500, "Tegucigalpa": 990,
    "San Salvador": 659, "Quceretaro": 1820,
    # Africa / Asia highland venues seen in qualifiers
    "Addis Ababa": 2355, "Nairobi": 1795, "Kampala": 1190, "Harare": 1490,
    "Lusaka": 1280, "Kigali": 1567, "Sanaa": 2250, "Asmara": 2325,
    "Tehran": 1200, "Kabul": 1790, "Thimphu": 2330, "Sucre": 2810,
}

# Home (baseline) altitude per nation — the elevation the team is adapted to,
# i.e. where it actually plays its home games. Default 0 (sea level) for any
# nation not listed; most football nations are coastal/lowland. Only the
# genuinely high-home nations need mapping — they're the ones whose ascent
# penalty stays low at altitude venues (so they're advantaged there).
HOME_ALT = {
    "Bolivia": 3640, "Ecuador": 2850, "Colombia": 2640, "Mexico": 2240,
    "Afghanistan": 1790, "Ethiopia": 2355, "Eritrea": 2325, "Yemen": 2250,
    "Bhutan": 2330, "Nepal": 1400, "Kenya": 1795, "Rwanda": 1567,
    "Zimbabwe": 1490, "Zambia": 1280, "Uganda": 1190, "Lesotho": 1600,
    "Eswatini": 1100, "Swaziland": 1100, "South Africa": 1500,
    "Guatemala": 1500, "Costa Rica": 1170, "Honduras": 990, "Iran": 1200,
    "Armenia": 990, "Madagascar": 1280, "Mongolia": 1300, "Kyrgyzstan": 800,
    "Andorra": 1020, "Spain": 667, "Peru": 154,
}


def venue_alt(city: str | None) -> float:
    return float(VENUE_ALT.get(city or "", 0))


def home_alt(team: str) -> float:
    return float(HOME_ALT.get(team, 0))


def penalty(team: str, va: float) -> float:
    """Ascent penalty (in km): how far the venue sits above the team's home."""
    return max(0.0, va - home_alt(team)) / 1000.0


def load_city_map() -> dict[tuple[str, str, str], str]:
    """(date_iso, home, away) -> venue city, read straight from results.csv."""
    path = DATA_DIR / "results.csv"
    out: dict[tuple[str, str, str], str] = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            out[(r["date"], r["home_team"], r["away_team"])] = r["city"]
    return out


def city_of(m, cities) -> str | None:
    return cities.get((m.d.isoformat(), m.home, m.away))


@dataclass
class AltitudeRatings:
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    beta_alt: float
    index: dict[str, int]

    def lambdas(self, home, away, neutral, pen_home, pen_away):
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        d = pen_away - pen_home
        lam = math.exp(self.intercept + self.attack[h] - self.defence[a] + hf + self.beta_alt * d)
        mu = math.exp(self.intercept + self.attack[a] - self.defence[h] - self.beta_alt * d)
        return lam, mu


def fit_altitude_ratings(matches, ref_day, cities, *, half_life_days=540.0,
                         min_matches=6, ridge=0.05, eligible=None) -> AltitudeRatings:
    counts: dict[str, int] = {}
    for m in matches:
        counts[m.home] = counts.get(m.home, 0) + 1
        counts[m.away] = counts.get(m.away, 0) + 1
    teams = sorted(t for t, c in counts.items()
                   if c >= min_matches and (eligible is None or t in eligible))
    index = {t: i for i, t in enumerate(teams)}
    tset = set(teams)
    ms = [m for m in matches if m.home in tset and m.away in tset]

    n = len(teams)
    decay = math.log(2) / half_life_days
    hi = np.array([index[m.home] for m in ms])
    ai = np.array([index[m.away] for m in ms])
    hs = np.array([m.hs for m in ms], dtype=float)
    aws = np.array([m.aws for m in ms], dtype=float)
    hf = np.array([0.0 if m.neutral else 1.0 for m in ms])

    def ad_of(m) -> float:
        va = venue_alt(city_of(m, cities))
        if va <= 0.0:
            return 0.0  # sea-level venue -> no ascent penalty either side
        return penalty(m.away, va) - penalty(m.home, va)

    ad = np.array([ad_of(m) for m in ms])  # altitude differential
    w = np.array([_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days)
                  for m in ms])

    def unpack(p):
        return p[0], p[1], p[2], p[3:3 + n], p[3 + n:3 + 2 * n]

    def nll_and_grad(p):
        c, gamma, beta, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + beta * ad
        eta_a = c + att[ai] - dfc[hi] - beta * ad
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)
        gh = w * (lam_h - hs)
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = ((gh - ga) * ad).sum()
        g_att = np.zeros(n); g_def = np.zeros(n)
        np.add.at(g_att, hi, gh); np.add.at(g_att, ai, ga)
        np.add.at(g_def, ai, -gh); np.add.at(g_def, hi, -ga)
        g[3:3 + n] = g_att + 2 * ridge * att
        g[3 + n:3 + 2 * n] = g_def + 2 * ridge * dfc
        return nll, g

    p0 = np.zeros(3 + 2 * n)
    p0[0] = math.log(1.35); p0[1] = 0.25
    res = minimize(nll_and_grad, p0, jac=True, method="L-BFGS-B",
                   options={"maxiter": 500})
    c, gamma, beta, att, dfc = unpack(res.x)
    att = att - att.mean(); dfc = dfc - dfc.mean()
    return AltitudeRatings(att, dfc, float(c), float(gamma), float(beta), index)


def backtest_year(matches, year, cities):
    start, end, _ = ALT_TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)
    ar = fit_altitude_ratings(train, ref_day=start, cities=cities, eligible=eligible)

    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()

    rps_base = rps_alt = rps_clim = 0.0
    n = high = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        va = venue_alt(city_of(m, cities))
        ph, pa = penalty(m.home, va), penalty(m.away, va)
        lb = base.lambdas(m.home, m.away, neutral=True)
        la = ar.lambdas(m.home, m.away, True, ph, pa)
        if lb is None or la is None:
            continue
        pb = ScorelineModel(*lb).match_result()
        pa_ = ScorelineModel(*la).match_result()
        rps_base += _rps(np.array([pb["home"], pb["draw"], pb["away"]]), out)
        rps_alt += _rps(np.array([pa_["home"], pa_["draw"], pa_["away"]]), out)
        rps_clim += _rps(clim, out)
        n += 1
        high += int(va >= 1000)
    return {"year": year, "n": n, "high": high, "beta": ar.beta_alt,
            "rps_base": rps_base, "rps_alt": rps_alt, "rps_clim": rps_clim}


def _run(matches, cities, years, label):
    agg = {"b": 0.0, "a": 0.0, "c": 0.0, "n": 0, "high": 0}
    betas = []
    for year in years:
        r = backtest_year(matches, year, cities)
        betas.append((year, r["beta"]))
        agg["b"] += r["rps_base"]; agg["a"] += r["rps_alt"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]; agg["high"] += r["high"]
    sb = 1 - agg["b"] / agg["c"]
    sa = 1 - agg["a"] / agg["c"]
    verdict = "KEEP" if sa > sb + 1e-9 else "DROP"
    bstr = " ".join(f"{y}:{b:+.4f}" for y, b in betas)
    # McSharry sanity: extra log-goals per 1 km of ascent differential = beta.
    goals_per_km = math.exp(np.mean([b for _, b in betas])) - 1.0
    print(f"  {label:<16} beta[{bstr}]  high {agg['high']}/{agg['n']}  "
          f"skill {sb*100:+.1f}% -> {sa*100:+.1f}%  ({(sa-sb)*100:+.2f} pts) "
          f"[{verdict}]  (~{goals_per_km*100:+.0f}% goals / km)")


def _main():
    matches = load_results()
    cities = load_city_map()
    print(f"loaded {len(matches):,} internationals; {len(cities):,} with venue city\n")
    print("Experiment #6 — altitude ascent-penalty differential covariate.")
    print("beta>0 => the less altitude-penalised (better-adapted) side scores more.")
    print("Gate = World Cups with altitude variation (NOT the 2018/2022 hold-out).")
    print("Sanity check fitted beta vs McSharry ~+0.5 goal / 1000 m.\n")
    _run(matches, cities, [2010], "2010 (neutral)")
    _run(matches, cities, [1986], "1986 Mexico")
    _run(matches, cities, [1970], "1970 Mexico")
    _run(matches, cities, [2010, 1986, 1970], "combined")


if __name__ == "__main__":
    _main()
