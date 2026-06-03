"""Fit national-team strengths and validate the model out-of-sample.

A Dixon-Coles / Maher Poisson model: every team carries an attack and a
defence strength, plus a global home-field term that is switched OFF for
neutral-venue matches (almost every World Cup game). Strengths are fit by
time-weighted maximum likelihood on recent internationals — recent matches
and competitive qualifiers carry more weight than a 2014 friendly.

The point of this module is honesty: before we bet a cent we measure
whether the model's probabilities are *calibrated* against real results
(out-of-sample Brier + log-loss vs a climatology baseline). If it can't
beat "just predict the base rate," the edge thesis is dead and we stop.

Data: martj42/international_results (results.csv) — 49k internationals
1872..2026, cached under .data/. Free, no key, includes 2024-25 qualifiers.
"""

from __future__ import annotations

import csv
import math
import urllib.request
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

from .model import ScorelineModel

DATA_DIR = Path(__file__).resolve().parent.parent / ".data"
RESULTS_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"


@dataclass
class Match:
    d: date
    home: str
    away: str
    hs: int
    aws: int
    tournament: str
    neutral: bool


def load_results(refresh: bool = False) -> list[Match]:
    DATA_DIR.mkdir(exist_ok=True)
    path = DATA_DIR / "results.csv"
    if refresh or not path.exists():
        urllib.request.urlretrieve(RESULTS_URL, path)
    out: list[Match] = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            if row["home_score"] in ("", "NA") or row["away_score"] in ("", "NA"):
                continue  # future / abandoned fixtures
            try:
                out.append(
                    Match(
                        d=date.fromisoformat(row["date"]),
                        home=row["home_team"],
                        away=row["away_team"],
                        hs=int(row["home_score"]),
                        aws=int(row["away_score"]),
                        tournament=row["tournament"],
                        neutral=row["neutral"].strip().upper() == "TRUE",
                    )
                )
            except ValueError:
                continue
    return out


# Competitive matches are a far better signal of strength than friendlies,
# so they carry extra weight in the likelihood.
def _importance(tournament: str) -> float:
    t = tournament.lower()
    if "world cup" in t and "qualif" not in t:
        return 1.6
    if "qualification" in t or "nations league" in t or "euro" in t or "copa" in t:
        return 1.3
    if "friendly" in t:
        return 0.7
    return 1.0


# Tournaments that only FIFA member nations contest — used to exclude
# CONIFA / novelty / regional sides (Yorkshire, Cascadia, Darfur, ...) that
# pollute the ratings with noise from low-quality friendlies.
_COMPETITIVE_KEYWORDS = (
    "world cup",
    "qualification",
    "nations league",
    "uefa euro",
    "copa américa",
    "african cup",
    "asian cup",
    "concacaf",
    "confederations",
    "gold cup",
    "ofc nations",
)


def fifa_member_teams(matches: list[Match], since: date) -> set[str]:
    elig: set[str] = set()
    for m in matches:
        if m.d < since:
            continue
        t = m.tournament.lower()
        if any(k in t for k in _COMPETITIVE_KEYWORDS):
            elig.add(m.home)
            elig.add(m.away)
    return elig


@dataclass
class Ratings:
    teams: list[str]
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    index: dict[str, int]

    def lambdas(self, home: str, away: str, neutral: bool) -> tuple[float, float] | None:
        if home not in self.index or away not in self.index:
            return None
        h, a = self.index[home], self.index[away]
        hf = 0.0 if neutral else self.home_adv
        lam = math.exp(self.intercept + self.attack[h] - self.defence[a] + hf)
        mu = math.exp(self.intercept + self.attack[a] - self.defence[h])
        return lam, mu


def fit_ratings(
    matches: list[Match],
    ref_day: date,
    *,
    half_life_days: float = 540.0,
    min_matches: int = 6,
    ridge: float = 0.05,
    eligible: set[str] | None = None,
) -> Ratings:
    # Keep teams with enough recent matches; rare teams can't be rated.
    # `eligible` (FIFA members) filters out CONIFA / novelty sides.
    counts: dict[str, int] = {}
    for m in matches:
        counts[m.home] = counts.get(m.home, 0) + 1
        counts[m.away] = counts.get(m.away, 0) + 1
    teams = sorted(
        t
        for t, c in counts.items()
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
    w = np.array(
        [_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days) for m in ms]
    )

    # params: [intercept, home_adv, attack(n), defence(n)]
    def unpack(p):
        return p[0], p[1], p[2 : 2 + n], p[2 + n : 2 + 2 * n]

    def nll_and_grad(p):
        c, gamma, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf
        eta_a = c + att[ai] - dfc[hi]
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)

        gh = w * (lam_h - hs)  # dNLL/d eta_h
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g_att = np.zeros(n)
        g_def = np.zeros(n)
        np.add.at(g_att, hi, gh)
        np.add.at(g_att, ai, ga)
        np.add.at(g_def, ai, -gh)
        np.add.at(g_def, hi, -ga)
        g[2 : 2 + n] = g_att + 2 * ridge * att
        g[2 + n : 2 + 2 * n] = g_def + 2 * ridge * dfc
        return nll, g

    p0 = np.zeros(2 + 2 * n)
    p0[0] = math.log(1.35)  # ~avg goals per team
    p0[1] = 0.25
    res = minimize(nll_and_grad, p0, jac=True, method="L-BFGS-B",
                   options={"maxiter": 500})
    c, gamma, att, dfc = unpack(res.x)
    # Mean-centre for interpretability (ridge already pins the scale).
    att = att - att.mean()
    dfc = dfc - dfc.mean()
    return Ratings(teams, att, dfc, float(c), float(gamma), index)


# --- validation ---


def evaluate(ratings: Ratings, test: list[Match]) -> dict:
    """Out-of-sample calibration vs a climatology baseline."""
    base = np.array([0.0, 0.0, 0.0])  # home/draw/away base rates from test
    for m in test:
        base[0 if m.hs > m.aws else 1 if m.hs == m.aws else 2] += 1
    base = base / base.sum()

    brier_m = brier_b = logloss_m = ou_brier_m = 0.0
    n = 0
    for m in test:
        lm = ratings.lambdas(m.home, m.away, m.neutral)
        if lm is None:
            continue
        sm = ScorelineModel(lm[0], lm[1])
        r = sm.match_result()
        p = np.array([r["home"], r["draw"], r["away"]])
        outcome = 0 if m.hs > m.aws else 1 if m.hs == m.aws else 2
        y = np.zeros(3); y[outcome] = 1
        brier_m += float(((p - y) ** 2).sum())
        brier_b += float(((base - y) ** 2).sum())
        logloss_m += -math.log(max(p[outcome], 1e-9))
        over = sm.over_under(2.5)["over"]
        ou_y = 1.0 if (m.hs + m.aws) > 2.5 else 0.0
        ou_brier_m += (over - ou_y) ** 2
        n += 1
    return {
        "n": n,
        "brier_model": brier_m / n,
        "brier_baseline": brier_b / n,
        "logloss_model": logloss_m / n,
        "ou25_brier_model": ou_brier_m / n,
        "skill_vs_baseline": 1 - (brier_m / brier_b),
    }


def _main() -> None:
    matches = load_results()
    print(f"loaded {len(matches):,} played internationals "
          f"({matches[0].d} .. {matches[-1].d})\n")

    cutoff = date(2025, 9, 1)
    train = [m for m in matches if m.d < cutoff]
    test = [m for m in matches if m.d >= cutoff]
    print(f"train: {len(train):,} matches (< {cutoff})   test: {len(test):,} matches (>= {cutoff})")

    eligible = fifa_member_teams(matches, since=date(2018, 1, 1))
    ratings = fit_ratings(train, ref_day=cutoff, eligible=eligible)
    print(f"fit {len(ratings.teams)} FIFA teams   intercept={ratings.intercept:.3f}  "
          f"home_adv={ratings.home_adv:.3f}\n")

    order = np.argsort(-(ratings.attack + ratings.defence))
    print("strongest (attack + defence):")
    for i in order[:10]:
        print(f"  {ratings.teams[i]:<16} att {ratings.attack[i]:+.2f}  def {ratings.defence[i]:+.2f}")

    metrics = evaluate(ratings, test)
    print("\nout-of-sample calibration:")
    print(f"  matches scored      {metrics['n']:,}")
    print(f"  Brier  model        {metrics['brier_model']:.4f}")
    print(f"  Brier  baseline     {metrics['brier_baseline']:.4f}   (climatology)")
    print(f"  skill vs baseline   {metrics['skill_vs_baseline']*100:+.1f}%   (higher = better)")
    print(f"  log-loss model      {metrics['logloss_model']:.4f}")
    print(f"  O/U 2.5 Brier       {metrics['ou25_brier_model']:.4f}")

    # Sample 2026 fixture prediction.
    print("\nsample fixture (neutral venue):")
    for h, a in [("Spain", "Germany"), ("France", "United States"), ("Brazil", "Argentina")]:
        lm = ratings.lambdas(h, a, neutral=True)
        if not lm:
            continue
        sm = ScorelineModel(*lm)
        r = sm.match_result()
        ou = sm.over_under(2.5)
        print(f"  {h} vs {a}: xG {lm[0]:.2f}-{lm[1]:.2f}  "
              f"1X2 {r['home']:.2f}/{r['draw']:.2f}/{r['away']:.2f}  O2.5 {ou['over']:.2f}")


if __name__ == "__main__":
    _main()
