"""THE GATE: does StatsBomb provider xG add signal beyond the goals rating?

This is the moment the whole xG investigation builds to. It asks the only
question that licenses a new covariate (PIPELINE.md's one rule): layered on top
of the goals-based Dixon-Coles rating, does a team's point-in-time xG strength
improve held-out tournament RPS — or is xG already "priced in" by the
time-decayed goals rating?

Data: StatsBomb open-data provider xG for WC2018, WC2022, Euro2020, Euro2024,
Copa2024, AFCON2023 (`refdata/statsbomb_xg.json`, built by sb_ingest). These are
the only competitions with free professional xG; crucially they include BOTH
2018 and 2022, the two World Cup folds the gate scores.

Methodology (identical to the travel two-stage in `regate.py`):
  * goals baseline = fit_ratings() on the martj42 feed strictly BEFORE each
    target tournament's opener (no lookahead).
  * xG covariate  = per-team decayed xG net rating (mean xg_for - xg_against)
    from StatsBomb matches strictly before the opener; differential
    d = xg_net[home] - xg_net[away], applied as eta_h += beta*d, eta_a -= beta*d.
  * beta is fit by Poisson MLE on a POOL of the OTHER tournaments (leave-one-
    tournament-out), never on the target. Score 1X2 via the scoreline model and
    compare RPS: covariate vs goals-only, both vs climatology.
  * KEEP iff the xG covariate's held-out RPS skill beats goals-only.

Honest expectation: the goals rating is fit on the FULL international history
(thousands of matches); the xG rating sees at most a handful of tournaments per
team. If xG loses or ties, that is the "priced in by decay" result, and it is a
real finding, not a failure. The gate decides.

Run:  python3 -m polymarket_agent.exp_xg_gate
"""

from __future__ import annotations

import json
import math
from datetime import date, datetime
from pathlib import Path

import numpy as np
from scipy.optimize import minimize_scalar

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .model import ScorelineModel
from .backtest_wc import _outcome, _rps

SB_PATH = Path(__file__).resolve().parents[1] / "refdata" / "statsbomb_xg.json"
HALF_LIFE_DAYS = 540.0
MIN_SB_MATCHES = 3  # a team needs >= this many prior xG matches to be rated

# StatsBomb -> martj42 name aliases (most already match exactly).
ALIAS = {
    "United States": "United States", "Korea Republic": "South Korea",
    "IR Iran": "Iran", "China PR": "China", "Ivory Coast": "Ivory Coast",
    "Czechia": "Czech Republic", "Turkey": "Turkey", "Türkiye": "Turkey",
}


def _d(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def load_sb() -> list[dict]:
    rows = json.loads(SB_PATH.read_text(encoding="utf-8"))
    for r in rows:
        r["d"] = _d(r["date"])
        r["home"] = ALIAS.get(r["home"], r["home"])
        r["away"] = ALIAS.get(r["away"], r["away"])
    return rows


def tournaments(rows: list[dict]) -> dict[str, tuple[date, date]]:
    out: dict[str, list[date]] = {}
    for r in rows:
        out.setdefault(r["comp"], []).append(r["d"])
    return {k: (min(v), max(v)) for k, v in out.items()}


def xg_net_snapshot(rows: list[dict], cutoff: date) -> dict[str, float]:
    """Decayed per-team xG net rating from all StatsBomb matches before cutoff."""
    num: dict[str, float] = {}
    den: dict[str, float] = {}
    cnt: dict[str, int] = {}
    for r in rows:
        if r["d"] >= cutoff:
            continue
        w = 0.5 ** ((cutoff - r["d"]).days / HALF_LIFE_DAYS)
        for team, gf, ga in ((r["home"], r["home_xg"], r["away_xg"]),
                             (r["away"], r["away_xg"], r["home_xg"])):
            num[team] = num.get(team, 0.0) + w * (gf - ga)
            den[team] = den.get(team, 0.0) + w
            cnt[team] = cnt.get(team, 0) + 1
    return {t: num[t] / den[t] for t in num if cnt[t] >= MIN_SB_MATCHES}


def goals_eta(ratings, home: str, away: str):
    lm = ratings.lambdas(home, away, neutral=True)
    if lm is None:
        return None
    return math.log(lm[0]), math.log(lm[1])


def fit_beta(pool: list[tuple]) -> float:
    """1-D Poisson MLE for the xG-differential scalar, goals prediction fixed."""
    if not pool:
        return 0.0
    eh = np.array([p[0] for p in pool]); ea = np.array([p[1] for p in pool])
    hs = np.array([p[2] for p in pool]); aws = np.array([p[3] for p in pool])
    dd = np.array([p[4] for p in pool])

    def nll(beta):
        etah = eh + beta * dd
        etaa = ea - beta * dd
        return -(hs * etah - np.exp(etah) + aws * etaa - np.exp(etaa)).sum()

    return float(minimize_scalar(nll, bounds=(-2.0, 2.0), method="bounded").x)


def run() -> None:
    sb = load_sb()
    tours = tournaments(sb)
    matches = load_results()
    print(f"StatsBomb xG matches: {len(sb)} across {len(tours)} tournaments")
    print("tournament windows:", {k: (str(a), str(b)) for k, (a, b) in tours.items()})

    # pre-fit goals ratings once per tournament opener (no lookahead)
    grat: dict[str, object] = {}
    for label, (start, _e) in tours.items():
        train = [m for m in matches if m.d < start]
        elig = fifa_member_teams(matches, since=date(start.year - 8, 1, 1))
        grat[label] = fit_ratings(train, ref_day=start, eligible=elig)

    agg = {"g": 0.0, "x": 0.0, "c": 0.0, "n": 0, "moved": 0}
    per_tour = []
    for label, (start, end) in sorted(tours.items(), key=lambda kv: kv[1][0]):
        ratings = grat[label]
        snap = xg_net_snapshot(sb, start)

        # beta fit pool = all OTHER tournaments, point-in-time
        pool = []
        for other, (os_, oe) in tours.items():
            if other == label:
                continue
            osnap = xg_net_snapshot(sb, os_)
            orat = grat[other]
            for r in sb:
                if r["comp"] != other:
                    continue
                e0 = goals_eta(orat, r["home"], r["away"])
                if e0 is None or r["home"] not in osnap or r["away"] not in osnap:
                    continue
                d = osnap[r["home"]] - osnap[r["away"]]
                pool.append((e0[0], e0[1], r["hg"], r["ag"], d))
        beta = fit_beta(pool)

        clim = np.zeros(3)
        test = [r for r in sb if r["comp"] == label]
        for r in test:
            clim[_outcome(r["hg"], r["ag"])] += 1
        clim = clim / clim.sum()

        rg = rx = rc = 0.0
        n = moved = 0
        for r in test:
            e0 = goals_eta(ratings, r["home"], r["away"])
            if e0 is None:
                continue
            out = _outcome(r["hg"], r["ag"])
            pg = ScorelineModel(math.exp(e0[0]), math.exp(e0[1])).match_result()
            pg = np.array([pg["home"], pg["draw"], pg["away"]])
            if r["home"] in snap and r["away"] in snap:
                d = snap[r["home"]] - snap[r["away"]]
                px = ScorelineModel(math.exp(e0[0] + beta * d),
                                    math.exp(e0[1] - beta * d)).match_result()
                px = np.array([px["home"], px["draw"], px["away"]])
                moved += 1
            else:
                px = pg  # abstain: no xG rating for one side
            rg += _rps(pg, out); rx += _rps(px, out); rc += _rps(clim, out)
            n += 1
        per_tour.append((label, beta, n, moved, rg, rx, rc))
        agg["g"] += rg; agg["x"] += rx; agg["c"] += rc
        agg["n"] += n; agg["moved"] += moved

    print(f"\n{'tournament':<11}{'beta':>8}{'moved':>9}"
          f"{'skill goals':>13}{'skill +xG':>12}{'delta':>9}")
    for label, beta, n, moved, rg, rx, rc in per_tour:
        sg = 1 - rg / rc if rc else 0
        sx = 1 - rx / rc if rc else 0
        print(f"{label:<11}{beta:>+8.3f}{moved:>4}/{n:<4}"
              f"{sg*100:>+11.1f}%{sx*100:>+10.1f}%{(sx-sg)*100:>+7.2f}p")
    sg = 1 - agg["g"] / agg["c"]; sx = 1 - agg["x"] / agg["c"]
    verdict = "KEEP" if sx > sg + 1e-9 else "DROP"
    print(f"\n{'COMBINED':<11}{'':>8}{agg['moved']:>4}/{agg['n']:<4}"
          f"{sg*100:>+11.1f}%{sx*100:>+10.1f}%{(sx-sg)*100:>+7.2f}p  [{verdict}]")
    print("\n(skill = RPS improvement vs climatology; +xG must beat goals to KEEP)")


if __name__ == "__main__":
    run()
