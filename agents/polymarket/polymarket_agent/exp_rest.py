"""Experiment #1 — rest days / fixture congestion as a Poisson covariate.

Hypothesis (Grok research, 2026-06-03): playing on short rest (<96h / <4 days)
suppresses *attacking* output, and the effect is visible at the OUTCOME level,
not just in sprint distance. If true, encoding congestion should improve the
World Cup hold-out RPS skill over the +11.7% baseline.

Design — honest, no test-set tuning:
  * Compute each team's days-since-last-match across the full chronological
    timeline (so a group-game-2 match correctly sees the group-game-1 date).
  * Turn it into a graded congestion penalty  cong = clip(4 - rest_days, 0, 3):
    rest of 3 days -> 1, 2 days -> 2, >=4 days or first appearance -> 0.
  * Add a single shared coefficient  beta * cong  to each team's attacking
    log-rate in the Dixon-Coles likelihood, fit JOINTLY with attack/defence on
    data strictly BEFORE the tournament opener. The congestion signal comes
    almost entirely from past tournaments (international windows are weeks
    apart), which is exactly the regime we're predicting.
  * Score the held-out World Cup with the fitted beta and compare RPS skill to
    the no-rest model fit on the identical data/eligibility.

Run:  python -m polymarket_agent.exp_rest
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

import numpy as np
from scipy.optimize import minimize

from .calibrate import (
    Match,
    _importance,
    fifa_member_teams,
    fit_ratings,
    load_results,
)
from .backtest_wc import TOURNAMENTS, _outcome, _rps
from .model import ScorelineModel

CONG_THRESHOLD = 4.0  # days; below this a team is "congested"
CONG_CAP = 3.0        # max graded penalty (a 1-day turnaround caps at 3)

# Two parameterizations of the same rest signal:
#  "cong"     one-sided <96h penalty  (tests fixture-congestion hypothesis)
#  "centered" gradient over the playable range, clip(rest,1,7)-4, capped so
#             that long international-window gaps don't dominate the fit
#             (tests the differential-rest hypothesis Grok emphasized).
FEATURE_MODE = "cong"


def compute_rest(matches: list[Match]) -> dict[int, tuple[float | None, float | None]]:
    """Map id(match) -> (rest_home, rest_away) in days, over the full timeline."""
    last: dict[str, date] = {}
    rest: dict[int, tuple[float | None, float | None]] = {}
    for m in sorted(matches, key=lambda x: x.d):
        rh = (m.d - last[m.home]).days if m.home in last else None
        ra = (m.d - last[m.away]).days if m.away in last else None
        rest[id(m)] = (rh, ra)
        last[m.home] = m.d
        last[m.away] = m.d
    return rest


def _cong(r: float | None) -> float:
    if FEATURE_MODE == "centered":
        # First-ever appearance -> treat as fully rested (top of the cap).
        rr = 7.0 if r is None else min(max(r, 1.0), 7.0)
        return rr - 4.0
    if r is None:
        return 0.0
    return min(max(CONG_THRESHOLD - r, 0.0), CONG_CAP)


@dataclass
class RestRatings:
    teams: list[str]
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    beta_cong: float
    index: dict[str, int]

    def lambdas(self, home, away, neutral, cong_home, cong_away):
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        lam = math.exp(
            self.intercept + self.attack[h] - self.defence[a] + hf
            + self.beta_cong * cong_home
        )
        mu = math.exp(
            self.intercept + self.attack[a] - self.defence[h]
            + self.beta_cong * cong_away
        )
        return lam, mu


def fit_rest_ratings(
    matches: list[Match],
    ref_day: date,
    rest: dict[int, tuple[float | None, float | None]],
    *,
    half_life_days: float = 540.0,
    min_matches: int = 6,
    ridge: float = 0.05,
    eligible: set[str] | None = None,
) -> RestRatings:
    counts: dict[str, int] = {}
    for m in matches:
        counts[m.home] = counts.get(m.home, 0) + 1
        counts[m.away] = counts.get(m.away, 0) + 1
    teams = sorted(
        t for t, c in counts.items()
        if c >= min_matches and (eligible is None or t in eligible)
    )
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
    ch = np.array([_cong(rest[id(m)][0]) for m in ms])
    ca = np.array([_cong(rest[id(m)][1]) for m in ms])
    w = np.array(
        [_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days) for m in ms]
    )

    # params: [intercept, home_adv, beta_cong, attack(n), defence(n)]
    def unpack(p):
        return p[0], p[1], p[2], p[3 : 3 + n], p[3 + n : 3 + 2 * n]

    def nll_and_grad(p):
        c, gamma, beta, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + beta * ch
        eta_a = c + att[ai] - dfc[hi] + beta * ca
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)

        gh = w * (lam_h - hs)
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = (gh * ch).sum() + (ga * ca).sum()
        g_att = np.zeros(n)
        g_def = np.zeros(n)
        np.add.at(g_att, hi, gh)
        np.add.at(g_att, ai, ga)
        np.add.at(g_def, ai, -gh)
        np.add.at(g_def, hi, -ga)
        g[3 : 3 + n] = g_att + 2 * ridge * att
        g[3 + n : 3 + 2 * n] = g_def + 2 * ridge * dfc
        return nll, g

    p0 = np.zeros(3 + 2 * n)
    p0[0] = math.log(1.35)
    p0[1] = 0.25
    res = minimize(nll_and_grad, p0, jac=True, method="L-BFGS-B",
                   options={"maxiter": 500})
    c, gamma, beta, att, dfc = unpack(res.x)
    att = att - att.mean()
    dfc = dfc - dfc.mean()
    return RestRatings(teams, att, dfc, float(c), float(gamma), float(beta), index)


def _score(probs_outcomes: list[tuple[np.ndarray, int]], base: np.ndarray) -> dict:
    rps_m = rps_b = 0.0
    correct = 0
    for p, out in probs_outcomes:
        rps_m += _rps(p, out)
        rps_b += _rps(base, out)
        correct += int(p.argmax() == out)
    n = len(probs_outcomes)
    return {
        "n": n,
        "rps_model": rps_m / n,
        "rps_base": rps_b / n,
        "rps_skill": 1 - (rps_m / rps_b),
        "accuracy": correct / n,
    }


def backtest_year(matches, year, rest) -> dict:
    start, end, _host = TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    test = [
        m for m in matches
        if start <= m.d <= end and m.tournament == "FIFA World Cup"
    ]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))

    base_ratings = fit_ratings(train, ref_day=start, eligible=eligible)
    rest_ratings = fit_rest_ratings(train, ref_day=start, rest=rest, eligible=eligible)

    base = np.zeros(3)
    for m in test:
        base[_outcome(m.hs, m.aws)] += 1
    base = base / base.sum()

    base_po: list[tuple[np.ndarray, int]] = []
    rest_po: list[tuple[np.ndarray, int]] = []
    n_congested = 0
    for m in test:
        out = _outcome(m.hs, m.aws)
        lb = base_ratings.lambdas(m.home, m.away, neutral=True)
        rh, ra = rest[id(m)]
        chome, caway = _cong(rh), _cong(ra)
        if chome != caway:  # rest asymmetry between the two sides
            n_congested += 1
        lr = rest_ratings.lambdas(m.home, m.away, True, chome, caway)
        if lb is None or lr is None:
            continue
        rb = ScorelineModel(*lb).match_result()
        rr = ScorelineModel(*lr).match_result()
        base_po.append((np.array([rb["home"], rb["draw"], rb["away"]]), out))
        rest_po.append((np.array([rr["home"], rr["draw"], rr["away"]]), out))

    return {
        "year": year,
        "beta_cong": rest_ratings.beta_cong,
        "n_congested": n_congested,
        "base": _score(base_po, base),
        "rest": _score(rest_po, base),
    }


def _run_mode(matches, rest, mode: str) -> None:
    global FEATURE_MODE
    FEATURE_MODE = mode
    desc = ("one-sided <96h penalty  clip(4-rest,0,3)" if mode == "cong"
            else "centered gradient  clip(rest,1,7)-4")
    print(f"--- feature mode: {mode}  ({desc}) ---")
    agg = {"rps_m_base": 0.0, "rps_m_rest": 0.0, "rps_b": 0.0, "n": 0}
    for year in sorted(TOURNAMENTS):
        r = backtest_year(matches, year, rest)
        b, x = r["base"], r["rest"]
        print(f"  {year}: beta {r['beta_cong']:+.4f}  "
              f"asym-rest games {r['n_congested']}/{b['n']}  "
              f"skill {b['rps_skill']*100:+.1f}% -> {x['rps_skill']*100:+.1f}% "
              f"({(x['rps_skill']-b['rps_skill'])*100:+.2f} pts)")
        agg["rps_m_base"] += b["rps_model"] * b["n"]
        agg["rps_m_rest"] += x["rps_model"] * x["n"]
        agg["rps_b"] += b["rps_base"] * b["n"]
        agg["n"] += b["n"]
    sb = 1 - agg["rps_m_base"] / agg["rps_b"]
    sx = 1 - agg["rps_m_rest"] / agg["rps_b"]
    verdict = "KEEP" if sx > sb + 1e-9 else "DROP"
    print(f"  combined ({int(agg['n'])} games): {sb*100:+.1f}% -> {sx*100:+.1f}%  "
          f"=> {(sx-sb)*100:+.2f} pts  [{verdict}]\n")


def _main() -> None:
    matches = load_results()
    rest = compute_rest(matches)
    print(f"loaded {len(matches):,} internationals; rest computed over full timeline\n")
    print("Experiment #1 — rest / congestion covariate, fit pre-tournament only.")
    print("beta<0 means LESS rest (lower feature) -> fewer goals, as hypothesized.\n")
    _run_mode(matches, rest, "cong")
    _run_mode(matches, rest, "centered")


if __name__ == "__main__":
    _main()
