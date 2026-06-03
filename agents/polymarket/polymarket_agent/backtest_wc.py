"""Hold-out backtest on the 2010, 2014, 2018 and 2022 World Cups — the honesty gate.

2010 (South Africa) and 2014 (Brazil) are first-class held-out cups alongside
2018/2022 because they are the only tournaments in the dataset that can SEE the
two covariates that matter most for 2026: 2010 has a real altitude spread
(highveld vs coast) and 2014 carries the largest within-tournament travel load
on record (~7,000 mi/team). 2018 (all sea-level) and 2022 (single-city Doha) are
structurally blind to both.

The +24% calibration skill in calibrate.py was measured on a rolling slice
of *all* internationals (mostly qualifiers and friendlies). Tournament
football is a different animal: neutral venues, max stakes, cagey group
games. This module asks the only question that licenses real money — does
the model predict *actual World Cup matches* better than "just predict the
base rate"?

Method, per target tournament: fit ratings using ONLY data before the
opening match (no peeking), then score every match of that World Cup with
the ranked probability score (RPS, the standard football-forecast metric),
Brier, log-loss, and outright accuracy, against a climatology baseline. If
the model can't beat climatology on real tournament matches, the props
edge thesis is dead and we stop before betting a cent.
"""

from __future__ import annotations

import math
from datetime import date

import numpy as np

from .calibrate import Match, fifa_member_teams, fit_ratings, load_results
from .model import ScorelineModel

# Opening/closing dates bound each tournament's match window. Host shown for
# the neutrality caveat (we predict all games as neutral — see note below).
#
# 2010 and 2014 are included because they are the only cups in the dataset that
# can SEE the two covariates that matter most for 2026: 2010 South Africa has a
# real altitude spread (highveld vs coast) and 2014 Brazil carries the largest
# within-tournament travel load on record (~7,000 mi/team). 2018 (sea-level)
# and 2022 (single-city Doha) are blind to both. See research/PROJECT_BRIEF.md.
TOURNAMENTS = {
    2010: (date(2010, 6, 11), date(2010, 7, 11), "South Africa"),
    2014: (date(2014, 6, 12), date(2014, 7, 13), "Brazil"),
    2018: (date(2018, 6, 14), date(2018, 7, 15), "Russia"),
    2022: (date(2022, 11, 20), date(2022, 12, 18), "Qatar"),
}


def _outcome(hs: int, aws: int) -> int:
    return 0 if hs > aws else 1 if hs == aws else 2


def _rps(p: np.ndarray, outcome: int) -> float:
    """Ranked probability score over ordered [home, draw, away]. Lower=better."""
    o = np.zeros(3)
    o[outcome] = 1.0
    cp = np.cumsum(p)
    co = np.cumsum(o)
    return float(((cp[:-1] - co[:-1]) ** 2).sum() / (len(p) - 1))


def backtest_one(matches: list[Match], year: int) -> dict:
    start, end, _host = TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    test = [
        m for m in matches
        if start <= m.d <= end and m.tournament == "FIFA World Cup"
    ]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    ratings = fit_ratings(train, ref_day=start, eligible=eligible)

    # Climatology = the base H/D/A rates of this tournament. Beating it means
    # the model adds information beyond "home wins ~46% of the time".
    base = np.zeros(3)
    for m in test:
        base[_outcome(m.hs, m.aws)] += 1
    base = base / base.sum()

    rps_m = rps_b = brier_m = brier_b = ll_m = ll_b = 0.0
    correct = 0
    n = 0
    skipped = 0
    for m in test:
        lm = ratings.lambdas(m.home, m.away, neutral=True)
        if lm is None:
            skipped += 1
            continue
        r = ScorelineModel(*lm).match_result()
        p = np.array([r["home"], r["draw"], r["away"]])
        out = _outcome(m.hs, m.aws)
        y = np.zeros(3); y[out] = 1.0
        rps_m += _rps(p, out); rps_b += _rps(base, out)
        brier_m += float(((p - y) ** 2).sum())
        brier_b += float(((base - y) ** 2).sum())
        ll_m += -math.log(max(p[out], 1e-9))
        ll_b += -math.log(max(base[out], 1e-9))
        correct += int(p.argmax() == out)
        n += 1

    return {
        "year": year, "n": n, "skipped": skipped, "teams_fit": len(ratings.teams),
        "rps_model": rps_m / n, "rps_base": rps_b / n,
        "brier_model": brier_m / n, "brier_base": brier_b / n,
        "logloss_model": ll_m / n, "logloss_base": ll_b / n,
        "accuracy": correct / n,
        "rps_skill": 1 - (rps_m / rps_b),
    }


def _print(res: dict) -> None:
    print(f"  matches scored      {res['n']}  (skipped {res['skipped']}, "
          f"fit {res['teams_fit']} teams)")
    print(f"  RPS    model        {res['rps_model']:.4f}")
    print(f"  RPS    climatology  {res['rps_base']:.4f}")
    print(f"  RPS    skill        {res['rps_skill']*100:+.1f}%   "
          f"({'model beats baseline' if res['rps_skill'] > 0 else 'BASELINE WINS'})")
    print(f"  Brier  model/base   {res['brier_model']:.4f} / {res['brier_base']:.4f}")
    print(f"  logloss model/base  {res['logloss_model']:.4f} / {res['logloss_base']:.4f}")
    print(f"  outright accuracy   {res['accuracy']*100:.1f}%   (argmax = result)")


def _main() -> None:
    matches = load_results()
    print(f"loaded {len(matches):,} internationals\n")
    print("Hold-out backtest on actual World Cup matches.")
    print("Ratings fit only on data BEFORE each opening match. Venues treated")
    print("as neutral (host home-edge ignored — minor, a handful of games).\n")

    agg = {k: 0.0 for k in ("rps_m", "rps_b", "n")}
    for year in sorted(TOURNAMENTS):
        res = backtest_one(matches, year)
        print(f"=== {year} World Cup ===")
        _print(res)
        print()
        agg["rps_m"] += res["rps_model"] * res["n"]
        agg["rps_b"] += res["rps_base"] * res["n"]
        agg["n"] += res["n"]

    skill = 1 - (agg["rps_m"] / agg["rps_b"])
    span = " + ".join(str(y) for y in sorted(TOURNAMENTS))
    print(f"=== combined {span} ===")
    print(f"  matches             {int(agg['n'])}")
    print(f"  RPS skill vs clim.  {skill*100:+.1f}%   "
          f"({'PASS — model adds information' if skill > 0 else 'FAIL'})")


if __name__ == "__main__":
    _main()
