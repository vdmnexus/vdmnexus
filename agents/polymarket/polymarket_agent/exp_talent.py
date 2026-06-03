"""Experiment #5 — squad talent (FIFA player ratings) as a strength covariate.

This is the direct shot at the "France blind spot": a results-only rating can't
see that a squad is loaded with elite players when recent RESULTS have been
mediocre (France 2022: model 6.1% champion vs market 17.1%). Player ratings are
information the time-decayed rating structurally cannot derive from past scores
— unlike rest (#1) and form (#4), which were already priced in by the decay and
died on this same gate.

No-lookahead data (the whole reason market value was parked — Transfermarkt is
current-only):
  * 2018 WC  -> FIFA 18 ratings (sofifa scrape, locked Sept 2017).
  * 2022 WC  -> FIFA 22 ratings (locked Sept 2021).
Both game versions are finalized BEFORE their tournament, so a squad-talent
number built from them is genuinely point-in-time.

Design — same honesty gate as exp_form.py / exp_rest.py:
  * talent(team) = mean Overall of the team's top-K players by Overall (squad
    proxy; we don't know the 23-man list, but top-K by rating is a fair, pre-
    tournament talent estimate), divided by 10 so the differential lands in a
    sane range. Teams absent from FIFA (e.g. Qatar) get no talent -> 0 (unknown).
  * Encode as a DIFFERENTIAL so one coefficient captures both sides:
        eta_home += beta * (talent_home - talent_away)
        eta_away += beta * (talent_away - talent_home)
    beta>0 means the more-talented side scores more.
  * The FIFA snapshot is a single point in time, so only assign talent to
    training matches within WINDOW days of the opener (keeps the snapshot
    contemporaneous; older matches get 0, exactly like unknown form). attack/
    defence still fit on the FULL history; beta gets its signal from the recent
    rated window.
  * Fit beta JOINTLY with attack/defence on data strictly BEFORE the opener,
    then score the held-out World Cup vs the no-talent baseline fit on identical
    data. Sweep K in {23,30} and window in {365,730} to avoid cherry-picking.

Run:  python -m polymarket_agent.exp_talent
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
from .backtest_wc import TOURNAMENTS, _outcome, _rps
from .model import ScorelineModel

# FIFA version contemporaneous with each tournament (locked before kickoff).
# 2026 uses the EA Sports FC 26 snapshot (fifa_version 26, update 4, released
# 2025-09 — predates the June 2026 opener, so lookahead-safe and current).
FIFA_FILE = {
    2018: ("fifa18_players.csv", "Nationality", "Overall"),
    2022: ("fifa22_players.csv", "nationality_name", "overall"),
    2026: ("fifa26_players.csv", "nationality_name", "overall"),
}
# FIFA nationality string -> results.csv team name (identity unless listed).
# The extra entries cover FC26 spellings of 2026 qualifiers; they are no-ops
# for the 2018/2022 files (those strings don't appear there).
FIFA_TO_TEAM = {
    "Korea Republic": "South Korea",
    "Czechia": "Czech Republic",
    "Curacao": "Curaçao",
    "Cabo Verde": "Cape Verde",
    "Congo DR": "DR Congo",
    "Côte d'Ivoire": "Ivory Coast",
    "Türkiye": "Turkey",
}
MIN_SQUAD = 11  # need at least this many rated players to form a talent value


def compute_talent(year: int, topk: int) -> dict[str, float]:
    """team -> mean Overall of its top-`topk` rated players, scaled by /10."""
    fname, nat_field, ovr_field = FIFA_FILE[year]
    path = DATA_DIR / fname
    pool: dict[str, list[float]] = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            nat = row.get(nat_field)
            ovr = row.get(ovr_field)
            if not nat or not ovr:
                continue
            try:
                o = float(ovr)
            except ValueError:
                continue
            team = FIFA_TO_TEAM.get(nat, nat)
            pool.setdefault(team, []).append(o)
    talent: dict[str, float] = {}
    for team, ovrs in pool.items():
        if len(ovrs) < MIN_SQUAD:
            continue
        ovrs.sort(reverse=True)
        talent[team] = float(np.mean(ovrs[:topk])) / 10.0
    return talent


@dataclass
class TalentRatings:
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    beta_talent: float
    index: dict[str, int]

    def lambdas(self, home, away, neutral, t_home, t_away):
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        d = t_home - t_away
        lam = math.exp(self.intercept + self.attack[h] - self.defence[a] + hf + self.beta_talent * d)
        mu = math.exp(self.intercept + self.attack[a] - self.defence[h] - self.beta_talent * d)
        return lam, mu


def fit_talent_ratings(matches, ref_day, talent, window_days, *,
                       half_life_days=540.0, min_matches=6, ridge=0.05,
                       eligible=None) -> TalentRatings:
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

    def td_of(m) -> float:
        th, ta = talent.get(m.home), talent.get(m.away)
        if th is None or ta is None:
            return 0.0
        if (ref_day - m.d).days > window_days:
            return 0.0  # snapshot too far from this match -> treat as unknown
        return th - ta

    td = np.array([td_of(m) for m in ms])  # talent differential
    w = np.array([_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days)
                  for m in ms])

    def unpack(p):
        return p[0], p[1], p[2], p[3:3 + n], p[3 + n:3 + 2 * n]

    def nll_and_grad(p):
        c, gamma, beta, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + beta * td
        eta_a = c + att[ai] - dfc[hi] - beta * td
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)
        gh = w * (lam_h - hs)
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = ((gh - ga) * td).sum()
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
    return TalentRatings(att, dfc, float(c), float(gamma), float(beta), index)


def backtest_year(matches, year, topk, window_days):
    start, end, _ = TOURNAMENTS[year]
    talent = compute_talent(year, topk)
    train = [m for m in matches if m.d < start]
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)
    tr = fit_talent_ratings(train, ref_day=start, talent=talent,
                            window_days=window_days, eligible=eligible)

    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()

    rps_base = rps_tal = rps_clim = 0.0
    n = covered = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        lb = base.lambdas(m.home, m.away, neutral=True)
        th, ta = talent.get(m.home), talent.get(m.away)
        d_ok = th is not None and ta is not None
        lt = tr.lambdas(m.home, m.away, True,
                        th if th is not None else 0.0,
                        ta if ta is not None else 0.0)
        if lb is None or lt is None:
            continue
        pb = ScorelineModel(*lb).match_result()
        pt = ScorelineModel(*lt).match_result()
        rps_base += _rps(np.array([pb["home"], pb["draw"], pb["away"]]), out)
        rps_tal += _rps(np.array([pt["home"], pt["draw"], pt["away"]]), out)
        rps_clim += _rps(clim, out)
        n += 1
        covered += int(d_ok)
    return {"year": year, "n": n, "covered": covered, "beta": tr.beta_talent,
            "rps_base": rps_base, "rps_tal": rps_tal, "rps_clim": rps_clim}


def _run(matches, topk, window_days):
    agg = {"b": 0.0, "t": 0.0, "c": 0.0, "n": 0, "cov": 0}
    betas = []
    for year in sorted(TOURNAMENTS):
        r = backtest_year(matches, year, topk, window_days)
        betas.append(r["beta"])
        agg["b"] += r["rps_base"]; agg["t"] += r["rps_tal"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]; agg["cov"] += r["covered"]
    sb = 1 - agg["b"] / agg["c"]
    st = 1 - agg["t"] / agg["c"]
    verdict = "KEEP" if st > sb + 1e-9 else "DROP"
    print(f"  K={topk:<2} win={window_days:<4}  beta {betas[0]:+.4f}/{betas[1]:+.4f}  "
          f"cover {agg['cov']}/{agg['n']}  "
          f"skill {sb*100:+.1f}% -> {st*100:+.1f}%  ({(st-sb)*100:+.2f} pts) [{verdict}]")


def _main():
    matches = load_results()
    print(f"loaded {len(matches):,} internationals\n")
    print("Experiment #5 — squad-talent (FIFA player-rating) differential covariate.")
    print("beta>0 => more-talented side scores more. Baseline = no-talent model.")
    print("Point-in-time: FIFA 18 for 2018 WC, FIFA 22 for 2022 WC (no lookahead).\n")
    for topk in (23, 30):
        for window_days in (365, 730):
            _run(matches, topk, window_days)


if __name__ == "__main__":
    _main()
