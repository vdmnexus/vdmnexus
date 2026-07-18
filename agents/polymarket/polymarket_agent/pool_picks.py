"""Exact-scoreline POOL pick sheet for the 2026 World Cup group stage.

This is the friends-pool sibling of sim.py. Same calibrated Dixon-Coles core,
same three gated covariates (host edge #2, squad talent #5, altitude #6), but
instead of champion odds it answers the only question a score-prediction pool
asks: *what exact scoreline do I write down for each match?*

The key subtlety it bakes in: in a TIERED pool (points for the exact score,
fewer for the right goal-difference, fewer still for just the right winner),
the points-maximising pick is NOT the model's single most-likely scoreline.
A wide score can be individually plausible yet a poor bet; a central low score
(1-0, 2-1, 1-1) usually banks more expected points because it collects on the
goal-difference and tendency tiers too. So for every match we brute-force the
expected points of every candidate scoreline against the full model
distribution and recommend the argmax — while still showing the raw modal
score so you can see when the two diverge.

Scoring scheme is the standard exact / goal-diff / tendency tier. Defaults are
4 / 3 / 2 (a very common pool setup); override on the CLI:

    python -m polymarket_agent.pool_picks                # 4/3/2 default
    python -m polymarket_agent.pool_picks 3 1 1          # exact=3, diff=1, tend=1
    python -m polymarket_agent.pool_picks 4 3 2 maxgoals=7

Only the group stage (72 fixtures) is predictable pre-tournament; knockout
fixtures depend on who advances, so re-run a knockout sheet once the bracket is
known (or read advancement odds from sim.py).
"""

from __future__ import annotations

import sys
from datetime import date

import numpy as np

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .roster_talent import load_live_talent
from .model import ScorelineModel
from .sim import (
    FIFA_TALENT_YEAR, GATED_BETA_TALENT, GROUPS, HOSTS, HOST_EDGE, TALENT_K,
    USE_ALTITUDE, USE_TALENT, Engine,
)

# --- tiered scoring (CLI-overridable) ------------------------------------
# A prediction earns, in order of specificity:
#   EXACT  — predicted score == actual score            (e.g. 2-1 vs 2-1)
#   GDIFF  — same signed goal difference, not exact      (2-1 vs 3-2, or 1-1 vs 2-2)
#   TEND   — same winner/draw only, wrong margin         (2-1 vs 4-0)
#   0      — wrong tendency
EXACT_PTS = 4.0
GDIFF_PTS = 3.0
TEND_PTS = 2.0
# Candidate scorelines to consider when optimising (0..MAXP each side). 6 is
# plenty — the optimum is essentially always a low score under any sane scheme.
MAXP = 6


def points(pi: int, pj: int, ai: int, aj: int,
           exact: float, gdiff: float, tend: float) -> float:
    """Pool points for predicting (pi,pj) when the actual score is (ai,aj)."""
    if pi == ai and pj == aj:
        return exact
    if (pi - pj) == (ai - aj):       # same signed goal difference (implies same tendency)
        return gdiff
    ps = (pi > pj) - (pi < pj)
    as_ = (ai > aj) - (ai < aj)
    if ps == as_:                    # same tendency W/D/L, different margin
        return tend
    return 0.0


def ev_optimal(matrix: np.ndarray, exact: float, gdiff: float, tend: float,
               maxp: int = MAXP) -> tuple[float, int, int]:
    """Return (expected_points, i, j) of the points-maximising scoreline."""
    n = matrix.shape[0]
    ii = np.arange(n)
    best = (-1.0, 0, 0)
    for pi in range(maxp + 1):
        for pj in range(maxp + 1):
            # Vectorised points table for this candidate over all actual (ai,aj).
            pts = np.full((n, n), tend)            # default: same-tendency value...
            # zero out wrong-tendency cells
            ps = (pi > pj) - (pi < pj)
            sign = np.subtract.outer(ii, ii)       # ai - aj
            actual_sign = np.sign(sign)
            pts[actual_sign != ps] = 0.0
            # goal-difference tier overwrites the matching-diff diagonal
            pts[sign == (pi - pj)] = gdiff
            # exact cell on top
            pts[pi, pj] = exact
            ev = float((matrix * pts).sum())
            if ev > best[0]:
                best = (ev, pi, pj)
    return best


def order_fixture(a: str, b: str) -> tuple[str, str]:
    """Put the co-host first so the recommended score reads host-vs-visitor.
    (Pure presentation; the engine applies the host edge regardless of order.)"""
    if a in HOSTS and b not in HOSTS:
        return a, b
    if b in HOSTS and a not in HOSTS:
        return b, a
    return a, b


def _parse_args(argv: list[str]) -> tuple[float, float, float, int]:
    exact, gdiff, tend, maxp = EXACT_PTS, GDIFF_PTS, TEND_PTS, MAXP
    pos = []
    for tok in argv:
        if tok.startswith("maxgoals="):
            maxp = int(tok.split("=", 1)[1])
        else:
            pos.append(tok)
    if len(pos) >= 3:
        exact, gdiff, tend = float(pos[0]), float(pos[1]), float(pos[2])
    return exact, gdiff, tend, maxp


def _main() -> None:
    exact, gdiff, tend, maxp = _parse_args(sys.argv[1:])

    matches = load_results()
    today = date.today()
    eligible = fifa_member_teams(matches, since=date(2018, 1, 1))
    ratings = fit_ratings(matches, ref_day=today, eligible=eligible)
    talent = load_live_talent(FIFA_TALENT_YEAR) if USE_TALENT else {}
    eng = Engine(ratings, host_edge=HOST_EDGE, talent=talent,
                 beta_talent=GATED_BETA_TALENT if USE_TALENT else 0.0,
                 altitude=USE_ALTITUDE)

    missing = [t for grp in GROUPS.values() for t in grp if t not in ratings.index]

    print("2026 World Cup — exact-scoreline pool pick sheet (group stage)")
    print(f"scoring: exact={exact:g} / goal-diff={gdiff:g} / tendency={tend:g} pts")
    print("features: host edge + squad talent (FIFA22 proxy) + Mexico altitude")
    print("PICK = expected-points-optimal score; modal = single most-likely score.\n")
    if missing:
        print(f"note: replacement-level (not in ratings): {sorted(set(missing))}\n")

    grand_ev = 0.0
    nfix = 0
    for g, teams in GROUPS.items():
        print(f"=== GROUP {g} " + "=" * 40)
        for x in range(4):
            for y in range(x + 1, 4):
                a, b = order_fixture(teams[x], teams[y])
                lam, mu = eng._lambdas(a, b)
                m = ScorelineModel(lam, mu)
                mat = np.asarray(m.matrix)
                ev, pi, pj = ev_optimal(mat, exact, gdiff, tend, maxp)
                mi, mj = np.unravel_index(int(mat.argmax()), mat.shape)
                r = m.match_result()
                board = m.correct_score_board(3)
                tops = ", ".join(f"{lbl} {p*100:.0f}%" for lbl, p in board)
                modal = f"{mi}-{mj}"
                pick = f"{pi}-{pj}"
                star = "" if pick == modal else f"  [modal {modal}]"
                print(f"  {a:<14} {pi}-{pj}  {b:<14}"
                      f"  W/D/L {r['home']*100:2.0f}/{r['draw']*100:2.0f}/{r['away']*100:2.0f}"
                      f"  EV {ev:.2f}{star}")
                print(f"      xg {lam:.2f}-{mu:.2f}   likeliest: {tops}")
                grand_ev += ev
                nfix += 1
        print()

    print(f"{nfix} group fixtures.  total expected pool points from these picks: "
          f"{grand_ev:.1f}  (avg {grand_ev/nfix:.2f}/match)")
    print("\nNotes:")
    print(" * 'PICK' maximises expected points under YOUR scheme — re-run with")
    print("   your pool's real point values as args if they differ from 4/3/2.")
    print(" * If your sheet lists a fixture in the opposite order, flip the score.")
    print(" * To win a pool (not just max points) you sometimes want a bolder,")
    print("   contrarian score on a match your rivals will all call safe — ask")
    print("   and I'll flag the high-variance spots.")


if __name__ == "__main__":
    _main()
