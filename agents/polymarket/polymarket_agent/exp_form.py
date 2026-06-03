"""Experiment #4 — recent form as a momentum covariate.

Grok's lists rank recent form high, and it has a real mechanism: short-term
form is exactly the information our 540-day half-life rating deliberately
smooths away (a hot striker, restored fitness, a tactical fix, squad cohesion).
The question: does a fast-form covariate add signal BEYOND the slow strength
rating, or is it already priced in by time decay (like rest turned out to be)?

Design — same honesty gate as exp_rest.py:
  * form(team, match) = mean goal-difference-per-game over the team's last K
    matches strictly before the match date (any competition), clipped to +/-3.
    Needs >=MIN_PRIOR prior matches else 0 (unknown).
  * Encode as a DIFFERENTIAL so one coefficient captures both sides:
        eta_home += beta * (form_home - form_away)
        eta_away += beta * (form_away - form_home)
    beta>0 means the better-form side scores more / the opponent's form
    suppresses it.
  * Fit beta JOINTLY with attack/defence on data strictly BEFORE the opener
    (no test-set tuning), then score the held-out World Cup. Compare RPS skill
    to the no-form baseline fit on identical data.
  * Sweep window K in {5,10} and metric in {gd, points} to avoid cherry-picking
    one parameterization.

Run:  python -m polymarket_agent.exp_form
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

import numpy as np
from scipy.optimize import minimize

from .calibrate import (
    Match, _importance, fifa_member_teams, fit_ratings, load_results,
)
from .backtest_wc import TOURNAMENTS, _outcome, _rps
from .model import ScorelineModel

MIN_PRIOR = 3
FORM_CAP = 3.0


def compute_form(matches, k: int, metric: str) -> dict[int, tuple[float, float]]:
    """id(match) -> (form_home, form_away) over each team's last k matches."""
    hist: dict[str, list[float]] = {}
    out: dict[int, tuple[float, float]] = {}

    def val(team_gf, team_ga) -> float:
        if metric == "points":
            return 3.0 if team_gf > team_ga else 1.0 if team_gf == team_ga else 0.0
        return team_gf - team_ga  # goal difference

    def form_of(team) -> float:
        h = hist.get(team)
        if not h or len(h) < MIN_PRIOR:
            return 0.0
        recent = h[-k:]
        return float(np.clip(np.mean(recent), -FORM_CAP, FORM_CAP))

    for m in sorted(matches, key=lambda x: x.d):
        out[id(m)] = (form_of(m.home), form_of(m.away))
        hist.setdefault(m.home, []).append(val(m.hs, m.aws))
        hist.setdefault(m.away, []).append(val(m.aws, m.hs))
    return out


@dataclass
class FormRatings:
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    beta_form: float
    index: dict[str, int]

    def lambdas(self, home, away, neutral, form_home, form_away):
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        d = form_home - form_away
        lam = math.exp(self.intercept + self.attack[h] - self.defence[a] + hf + self.beta_form * d)
        mu = math.exp(self.intercept + self.attack[a] - self.defence[h] - self.beta_form * d)
        return lam, mu


def fit_form_ratings(matches, ref_day, form, *, half_life_days=540.0,
                     min_matches=6, ridge=0.05, eligible=None) -> FormRatings:
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
    fd = np.array([form[id(m)][0] - form[id(m)][1] for m in ms])  # form differential
    w = np.array([_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days)
                  for m in ms])

    def unpack(p):
        return p[0], p[1], p[2], p[3:3 + n], p[3 + n:3 + 2 * n]

    def nll_and_grad(p):
        c, gamma, beta, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + beta * fd
        eta_a = c + att[ai] - dfc[hi] - beta * fd
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)
        gh = w * (lam_h - hs)
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = ((gh - ga) * fd).sum()
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
    return FormRatings(att, dfc, float(c), float(gamma), float(beta), index)


def backtest_year(matches, year, form):
    start, end, _ = TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    base = fit_ratings(train, ref_day=start, eligible=eligible)
    fr = fit_form_ratings(train, ref_day=start, form=form, eligible=eligible)

    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()

    rps_base = rps_form = rps_clim = 0.0
    n = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        lb = base.lambdas(m.home, m.away, neutral=True)
        fh, fa = form[id(m)]
        lf = fr.lambdas(m.home, m.away, True, fh, fa)
        if lb is None or lf is None:
            continue
        pb = ScorelineModel(*lb).match_result()
        pf = ScorelineModel(*lf).match_result()
        rps_base += _rps(np.array([pb["home"], pb["draw"], pb["away"]]), out)
        rps_form += _rps(np.array([pf["home"], pf["draw"], pf["away"]]), out)
        rps_clim += _rps(clim, out)
        n += 1
    return {"year": year, "n": n, "beta": fr.beta_form,
            "rps_base": rps_base, "rps_form": rps_form, "rps_clim": rps_clim}


def _run(matches, k, metric):
    form = compute_form(matches, k, metric)
    agg = {"b": 0.0, "f": 0.0, "c": 0.0, "n": 0}
    betas = []
    for year in sorted(TOURNAMENTS):
        r = backtest_year(matches, year, form)
        betas.append(r["beta"])
        agg["b"] += r["rps_base"]; agg["f"] += r["rps_form"]
        agg["c"] += r["rps_clim"]; agg["n"] += r["n"]
    sb = 1 - agg["b"] / agg["c"]
    sf = 1 - agg["f"] / agg["c"]
    verdict = "KEEP" if sf > sb + 1e-9 else "DROP"
    print(f"  K={k:<2} metric={metric:<6}  beta {betas[0]:+.4f}/{betas[1]:+.4f}  "
          f"skill {sb*100:+.1f}% -> {sf*100:+.1f}%  ({(sf-sb)*100:+.2f} pts) [{verdict}]")


def _main():
    matches = load_results()
    print(f"loaded {len(matches):,} internationals\n")
    print("Experiment #4 — recent-form differential covariate (fit pre-tournament).")
    print("beta>0 => better-form side scores more. Baseline = no-form model.\n")
    for metric in ("gd", "points"):
        for k in (5, 10):
            _run(matches, k, metric)


if __name__ == "__main__":
    _main()
