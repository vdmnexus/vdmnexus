"""Experiment #8 — heat (acclimatisation-penalty) as a strength covariate.

The 2026 FWC plays many afternoon matches in genuine heat — ClimateCentral
flags 49 of 104 fixtures with a >=50% chance of exceeding 28 C, the point
where measured player output (distance, sprints) falls off. Heat is a VENUE
factor, the same category as host advantage (#2), squad talent (#5) and
altitude (#6): new information the score-only rating can't derive from past
results. The mechanism we test is the same as altitude — not home advantage
but ACCLIMATISATION: a team from a cool climate forced to play in the heat is
impaired; a team from a hot home climate is not. Playing somewhere COOLER than
home is not a penalty, so the stress is one-sided, exactly like ascent:

    stress(team) = max(0, venue_temp - home_temp(team)) / 10      # per 10 C
    eta_home += beta * (stress_away - stress_home)                # beta > 0
    eta_away -= beta * (stress_away - stress_home)

beta>0 => the less heat-stressed (better-acclimatised) side scores more.

THE GATE IS DIFFERENT, just like altitude. Our usual hold-out (2018 Russia +
2022 Qatar) is heat-blind: 2018 was mild and 2022 was a deliberately-cooled
November tournament. So we gate on the sea-level World Cups that actually had a
wide heat spread (and no altitude confound):
  * 1994 United States — the prize gate. Brutal afternoon heat in Dallas,
    Orlando, Washington, Pasadena against a cool San Francisco Bay / Foxborough
    / domed Pontiac contrast. A big European (cool-home) contingent supplies
    the differential.
  * 2014 Brazil — Amazonian/north-east heat (Manaus, Fortaleza, Cuiabá,
    Natal) against the cool south (Porto Alegre, Curitiba, Sao Paulo).
2010 SA (winter, cool, no spread) and 1986/1970 Mexico (heat confounded with
altitude) are deliberately excluded. Like altitude there is NO time window —
climate is permanent geography, so every training match at a known-hot venue
contributes. Fit beta JOINTLY with attack/defence on data strictly BEFORE each
gate tournament, then score the held-out WC vs the no-heat baseline.

NOTE ON DATA. VENUE_TEMP / HOME_TEMP are approximate tournament-month
climate normals (deg C), hand-mapped exactly like VENUE_ALT / HOME_ALT in
exp_altitude. Approximate is fine for a GATE: if the signal is real it
survives leave-one-WC-out, and only then would the normals be refined before
anything is wired into sim.py. Unknown venue -> no adjustment either side.

Run:  python -m polymarket_agent.exp_heat
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

# Sea-level World Cups with a wide heat spread (start, end, host). Distinct
# from the 2018/2022 gate (heat-blind) and from the altitude gate (confounded).
HEAT_TOURNAMENTS = {
    1994: (date(1994, 6, 17), date(1994, 7, 17), "United States"),
    2014: (date(2014, 6, 12), date(2014, 7, 13), "Brazil"),
}

# Approximate match-month temperature (deg C) at each venue city. Domed /
# climate-controlled venues are pinned to a controlled ~21 C regardless of the
# outside air. Default (unknown city) -> None = no heat adjustment either side.
VENUE_TEMP = {
    # 1994 USA (June-July afternoons)
    "Dallas": 35, "Orlando": 33, "Washington, D.C.": 31, "Pasadena": 30,
    "East Rutherford": 29, "Chicago": 28, "Foxborough": 27, "Palo Alto": 26,
    "Pontiac": 21,  # Silverdome — indoor
    # 2014 Brazil (June-July; southern winter, tropical north hot)
    "Manaus": 32, "Cuiabá": 33, "Fortaleza": 30, "Natal": 29, "Recife": 29,
    "Salvador": 27, "Rio de Janeiro": 25, "Brasília": 26, "Belo Horizonte": 25,
    "São Paulo": 21, "Curitiba": 18, "Porto Alegre": 18,
    # 2018 Russia (mostly mild; listed so a near-null check is possible)
    "Volgograd": 28, "Rostov-on-Don": 27, "Sochi": 26, "Samara": 25,
    "Moscow": 22, "Saint Petersburg": 21, "Kazan": 23, "Nizhny Novgorod": 23,
    "Ekaterinburg": 22, "Kaliningrad": 21, "Saransk": 23,
    # 2026 USA / Mexico / Canada (June-July). Atlanta, Dallas, Houston are
    # climate-controlled (ClimateCentral) -> pinned ~21 C. Live-use only;
    # 2026 has no result to score so it never enters the gate.
    "Monterrey": 35, "Miami": 32, "Kansas City": 31, "Philadelphia": 30,
    "Los Angeles": 29, "New York New Jersey": 29, "San Francisco Bay Area": 28,
    "Guadalajara": 27, "Boston": 27, "Toronto": 26, "Seattle": 24,
    "Mexico City": 24, "Vancouver": 22,
    "Atlanta": 21, "Dallas ": 21, "Houston": 21,  # controlled (note trailing
    # space avoids clobbering 1994 outdoor "Dallas"; 2026 Dallas keyed below)
}
# 2026 Dallas (AT&T, retractable roof / AC) is controlled; 1994 Dallas (Cotton
# Bowl, open) was brutal. results.csv only contains the 1994 string "Dallas",
# so the open value above governs the gate; the controlled value is documented
# for the live 2026 wiring (handled in sim.py, not here).

# Home (baseline) warm-season climate per nation (deg C) — the heat the team is
# acclimatised to. Default 20 C (temperate) for any nation not listed. Only the
# relative hot/cool ordering drives the differential.
HOME_TEMP = {
    # Hot-home (desert / tropical / continental-summer): low stress in heat
    "Saudi Arabia": 42, "Qatar": 42, "Iraq": 43, "Iran": 36, "Jordan": 33,
    "Egypt": 35, "Tunisia": 33, "Algeria": 33, "Morocco": 29, "United Arab Emirates": 41,
    "Senegal": 31, "Ghana": 31, "Nigeria": 32, "Cameroon": 30, "Ivory Coast": 31,
    "DR Congo": 30, "Cape Verde": 27, "South Africa": 26, "Mali": 38,
    "Brazil": 30, "Paraguay": 31, "Bolivia": 28, "Colombia": 27, "Ecuador": 25,
    "Argentina": 25, "Uruguay": 22, "Mexico": 27, "Panama": 31, "Honduras": 31,
    "Costa Rica": 26, "Haiti": 32, "Curaçao": 31, "United States": 30,
    "Australia": 28, "Uzbekistan": 36, "South Korea": 29, "Japan": 30,
    "Saudi Arabia ": 42, "Spain": 31, "Greece": 32, "Turkey": 31, "Italy": 29,
    "Portugal": 28, "Croatia": 28, "Bosnia and Herzegovina": 28, "Bulgaria": 29,
    "Romania": 29, "Serbia": 28, "Iraq ": 43,
    # Cool-home (Northern / maritime / highland): high stress in heat
    "England": 21, "Scotland": 18, "Wales": 20, "Ireland": 19,
    "Republic of Ireland": 19, "Norway": 21, "Sweden": 22, "Denmark": 21,
    "Finland": 22, "Netherlands": 21, "Belgium": 22, "Germany": 24,
    "France": 25, "Switzerland": 24, "Austria": 25, "Czech Republic": 24,
    "Poland": 24, "Russia": 23, "Canada": 24, "New Zealand": 20, "Iceland": 14,
}


def venue_temp(city: str | None) -> float | None:
    return VENUE_TEMP.get(city or "")


def home_temp(team: str) -> float:
    return float(HOME_TEMP.get(team, 20))


def stress(team: str, vt: float) -> float:
    """Heat-acclimatisation penalty (per 10 C): venue above the team's home."""
    return max(0.0, vt - home_temp(team)) / 10.0


def load_city_map() -> dict[tuple[str, str, str], str]:
    path = DATA_DIR / "results.csv"
    out: dict[tuple[str, str, str], str] = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            out[(r["date"], r["home_team"], r["away_team"])] = r["city"]
    return out


def city_of(m, cities) -> str | None:
    return cities.get((m.d.isoformat(), m.home, m.away))


@dataclass
class HeatRatings:
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    beta_heat: float
    index: dict[str, int]

    def lambdas(self, home, away, neutral, st_home, st_away):
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        d = st_away - st_home
        lam = math.exp(self.intercept + self.attack[h] - self.defence[a] + hf + self.beta_heat * d)
        mu = math.exp(self.intercept + self.attack[a] - self.defence[h] - self.beta_heat * d)
        return lam, mu


def fit_heat_ratings(matches, ref_day, cities, *, half_life_days=540.0,
                     min_matches=6, ridge=0.05, eligible=None) -> HeatRatings:
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

    def hd_of(m) -> float:
        vt = venue_temp(city_of(m, cities))
        if vt is None:
            return 0.0  # unknown venue temp -> no heat differential
        return stress(m.away, vt) - stress(m.home, vt)

    hd = np.array([hd_of(m) for m in ms])  # heat differential
    w = np.array([_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days)
                  for m in ms])

    def unpack(p):
        return p[0], p[1], p[2], p[3:3 + n], p[3 + n:3 + 2 * n]

    def nll_and_grad(p):
        c, gamma, beta, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + beta * hd
        eta_a = c + att[ai] - dfc[hi] - beta * hd
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)
        gh = w * (lam_h - hs)
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = ((gh - ga) * hd).sum()
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
    return HeatRatings(att, dfc, float(c), float(gamma), float(beta), index)


def backtest_year(matches, year, cities):
    start, end, _ = HEAT_TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)
    hr = fit_heat_ratings(train, ref_day=start, cities=cities, eligible=eligible)

    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()

    rps_base = rps_heat = rps_clim = 0.0
    n = hot = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        vt = venue_temp(city_of(m, cities))
        sh = stress(m.home, vt) if vt is not None else 0.0
        sa = stress(m.away, vt) if vt is not None else 0.0
        lb = base.lambdas(m.home, m.away, neutral=True)
        lh = hr.lambdas(m.home, m.away, True, sh, sa)
        if lb is None or lh is None:
            continue
        pb = ScorelineModel(*lb).match_result()
        ph = ScorelineModel(*lh).match_result()
        rps_base += _rps(np.array([pb["home"], pb["draw"], pb["away"]]), out)
        rps_heat += _rps(np.array([ph["home"], ph["draw"], ph["away"]]), out)
        rps_clim += _rps(clim, out)
        n += 1
        hot += int(vt is not None and vt >= 28)
    return {"year": year, "n": n, "hot": hot, "beta": hr.beta_heat,
            "rps_base": rps_base, "rps_heat": rps_heat, "rps_clim": rps_clim}


# --- variant B: symmetric total-goals suppression (the experts' mechanism) ---
# Heat slows BOTH teams ("fewer chances created", lower tempo). Model it as a
# single scalar delta that damps both lambdas by the venue's excess over the
# 28 C threshold ClimateCentral names. delta<0 expected. This mostly reshapes
# scorelines (more 0-0 / low scores) -> tests whether it nudges W/D/L RPS.

def hotness(vt: float | None) -> float:
    return 0.0 if vt is None else max(0.0, vt - 28.0) / 10.0


@dataclass
class HeatTotalRatings:
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    delta: float
    index: dict[str, int]

    def lambdas(self, home, away, neutral, hot):
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        lam = math.exp(self.intercept + self.attack[h] - self.defence[a] + hf + self.delta * hot)
        mu = math.exp(self.intercept + self.attack[a] - self.defence[h] + self.delta * hot)
        return lam, mu


def fit_heat_total(matches, ref_day, cities, *, half_life_days=540.0,
                   min_matches=6, ridge=0.05, eligible=None) -> HeatTotalRatings:
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
    hot = np.array([hotness(venue_temp(city_of(m, cities))) for m in ms])
    w = np.array([_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days)
                  for m in ms])

    def unpack(p):
        return p[0], p[1], p[2], p[3:3 + n], p[3 + n:3 + 2 * n]

    def nll_and_grad(p):
        c, gamma, delta, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + delta * hot
        eta_a = c + att[ai] - dfc[hi] + delta * hot
        lam_h = np.exp(eta_h); lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)
        gh = w * (lam_h - hs); ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = ((gh + ga) * hot).sum()
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
    c, gamma, delta, att, dfc = unpack(res.x)
    att = att - att.mean(); dfc = dfc - dfc.mean()
    return HeatTotalRatings(att, dfc, float(c), float(gamma), float(delta), index)


def backtest_year_total(matches, year, cities):
    start, end, _ = HEAT_TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)
    hr = fit_heat_total(train, ref_day=start, cities=cities, eligible=eligible)
    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()
    rps_base = rps_heat = rps_clim = 0.0
    n = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        hot = hotness(venue_temp(city_of(m, cities)))
        lb = base.lambdas(m.home, m.away, neutral=True)
        lh = hr.lambdas(m.home, m.away, True, hot)
        if lb is None or lh is None:
            continue
        pb = ScorelineModel(*lb).match_result()
        ph = ScorelineModel(*lh).match_result()
        rps_base += _rps(np.array([pb["home"], pb["draw"], pb["away"]]), out)
        rps_heat += _rps(np.array([ph["home"], ph["draw"], ph["away"]]), out)
        rps_clim += _rps(clim, out)
        n += 1
    return {"year": year, "n": n, "delta": hr.delta,
            "rps_base": rps_base, "rps_heat": rps_heat, "rps_clim": rps_clim}


def _run_total(matches, cities, years, label):
    agg = {"b": 0.0, "h": 0.0, "c": 0.0, "n": 0}
    deltas = []
    for year in years:
        r = backtest_year_total(matches, year, cities)
        deltas.append((year, r["delta"]))
        agg["b"] += r["rps_base"]; agg["h"] += r["rps_heat"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]
    sb = 1 - agg["b"] / agg["c"]
    sh = 1 - agg["h"] / agg["c"]
    verdict = "KEEP" if sh > sb + 1e-9 else "DROP"
    dstr = " ".join(f"{y}:{d:+.4f}" for y, d in deltas)
    print(f"  {label:<18} delta[{dstr}]  "
          f"skill {sb*100:+.1f}% -> {sh*100:+.1f}%  ({(sh-sb)*100:+.2f} pts) "
          f"[{verdict}]")


def _run(matches, cities, years, label):
    agg = {"b": 0.0, "h": 0.0, "c": 0.0, "n": 0, "hot": 0}
    betas = []
    for year in years:
        r = backtest_year(matches, year, cities)
        betas.append((year, r["beta"]))
        agg["b"] += r["rps_base"]; agg["h"] += r["rps_heat"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]; agg["hot"] += r["hot"]
    sb = 1 - agg["b"] / agg["c"]
    sh = 1 - agg["h"] / agg["c"]
    verdict = "KEEP" if sh > sb + 1e-9 else "DROP"
    bstr = " ".join(f"{y}:{b:+.4f}" for y, b in betas)
    print(f"  {label:<18} beta[{bstr}]  hot(>=28) {agg['hot']}/{agg['n']}  "
          f"skill {sb*100:+.1f}% -> {sh*100:+.1f}%  ({(sh-sb)*100:+.2f} pts) "
          f"[{verdict}]")


def _main():
    matches = load_results()
    cities = load_city_map()
    print(f"loaded {len(matches):,} internationals; {len(cities):,} with venue city\n")
    print("Experiment #8 — heat acclimatisation-penalty differential covariate.")
    print("beta>0 => the less heat-stressed (better-acclimatised) side scores more.")
    print("Gate = sea-level World Cups with a heat spread (1994 USA, 2014 Brazil).\n")
    print("Variant A — differential acclimatisation (better-adapted scores more):")
    _run(matches, cities, [1994], "1994 USA")
    _run(matches, cities, [2014], "2014 Brazil")
    _run(matches, cities, [1994, 2014], "combined")
    print("\nVariant B — symmetric total-goals suppression (heat slows BOTH teams,")
    print("the experts' 'fewer chances created' mechanism; delta<0 expected):")
    _run_total(matches, cities, [1994], "1994 USA")
    _run_total(matches, cities, [2014], "2014 Brazil")
    _run_total(matches, cities, [1994, 2014], "combined")


if __name__ == "__main__":
    _main()
