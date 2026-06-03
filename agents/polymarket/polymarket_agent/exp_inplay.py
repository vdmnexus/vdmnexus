"""Edge B, modeling half — offline in-play win-probability calibration.

The question this answers, for free, before any paid live feed or execution:
can a simple live-state model produce CALIBRATED in-play win probabilities?
If "62% at minute 67 leading 1-0" doesn't actually win ~62% of the time, the
whole in-play pivot is dead and we never sign a data contract.

Method (no lookahead beyond the strength fit):
  * Fit Dixon-Coles strengths ONCE on data before a cutoff -> pre-match
    lambdas lam_h, lam_a for each test match (home edge applied if not neutral).
  * Replay each test match's scoreline from goal-minute events (goalscorers.csv).
    Keep only matches whose reconstructed 90' score matches results.csv, so we
    know the event stream is complete (drops ET/penalty and missing-data games).
  * At probe minutes, take the current score and model the REMAINING goals as
    independent Poisson with rate scaled by the fraction of the match left:
        lam_rem = lam_full * (90 - minute) / 90
    Final score = current + remaining -> P(home / draw / away).
  * Score those live probabilities against the actual regulation result:
    multiclass Brier + reliability table (ECE). Split by match phase so we can
    see whether LATE-game probabilities (the ones that matter for in-play) are
    the calibrated ones.

This tests the *mechanism only* — pure time-scaling, conditioned on score, no
xG / momentum / red cards. If even this is roughly calibrated, the idea has
legs and we can layer real signals on top. If it's badly off, we stop.

Run:  python -m polymarket_agent.exp_inplay
"""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import date
from math import exp

import numpy as np

from .calibrate import DATA_DIR, fifa_member_teams, fit_ratings, load_results

PROBES = [1, 15, 30, 45, 60, 75, 85]
MAXG = 10  # truncation for remaining-goal Poisson
CUTOFF = date(2021, 1, 1)  # fit strengths before this; test on/after


def _pois_pmf(lam: float, k: int = MAXG) -> np.ndarray:
    p = np.empty(k + 1)
    p[0] = exp(-lam)
    for i in range(1, k + 1):
        p[i] = p[i - 1] * lam / i
    return p


def load_goal_events() -> dict[tuple, list[tuple[int, str]]]:
    """(date,home,away) -> sorted [(minute, 'H'|'A')] for the scoring side."""
    path = DATA_DIR / "goalscorers.csv"
    ev: dict[tuple, list[tuple[int, str]]] = defaultdict(list)
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            mn = r["minute"]
            if mn in ("", "NA"):
                continue
            try:
                minute = int(float(mn))
            except ValueError:
                continue
            home, away, team = r["home_team"], r["away_team"], r["team"]
            # `team` is the side the goal is credited to (incl. own goals).
            side = "H" if team == home else "A" if team == away else None
            if side is None:
                continue
            ev[(r["date"], home, away)].append((min(minute, 90), side))
    for k in ev:
        ev[k].sort()
    return ev


def score_at(events: list[tuple[int, str]], minute: int) -> tuple[int, int]:
    h = sum(1 for m, s in events if m <= minute and s == "H")
    a = sum(1 for m, s in events if m <= minute and s == "A")
    return h, a


def live_probs(lam_h, lam_a, cur_h, cur_a, minute) -> tuple[float, float, float]:
    frac = max(90 - minute, 0) / 90.0
    ph = _pois_pmf(lam_h * frac)
    pa = _pois_pmf(lam_a * frac)
    joint = np.outer(ph, pa)  # [extra_home, extra_away]
    pH = pD = pA = 0.0
    for i in range(MAXG + 1):
        fh = cur_h + i
        for j in range(MAXG + 1):
            fa = cur_a + j
            w = joint[i, j]
            if fh > fa:
                pH += w
            elif fh == fa:
                pD += w
            else:
                pA += w
    tot = pH + pD + pA
    return pH / tot, pD / tot, pA / tot


def _reliability(records: list[tuple[float, int]], bins: int = 10):
    """records = [(predicted_prob_for_a_class, hit 0/1)]; returns (ECE, table)."""
    edges = np.linspace(0, 1, bins + 1)
    table = []
    ece = 0.0
    n = len(records)
    arr_p = np.array([p for p, _ in records])
    arr_y = np.array([y for _, y in records], dtype=float)
    for b in range(bins):
        lo, hi = edges[b], edges[b + 1]
        mask = (arr_p >= lo) & (arr_p < hi if b < bins - 1 else arr_p <= hi)
        c = int(mask.sum())
        if not c:
            continue
        mp = float(arr_p[mask].mean())
        my = float(arr_y[mask].mean())
        ece += c / n * abs(mp - my)
        table.append((lo, hi, c, mp, my))
    return ece, table


def _main() -> None:
    matches = load_results()
    events = load_goal_events()
    final = {(m.d.isoformat(), m.home, m.away): (m.hs, m.aws) for m in matches}

    train = [m for m in matches if m.d < CUTOFF]
    eligible = fifa_member_teams(matches, since=date(2014, 1, 1))
    ratings = fit_ratings(train, ref_day=CUTOFF, eligible=eligible)
    print(f"fit {len(ratings.teams)} teams on {len(train):,} matches before {CUTOFF}\n")

    # multiclass Brier and per-class reliability records, split by phase
    phases = {"early(<=30)": (0, 30), "mid(31-69)": (31, 69), "late(>=70)": (70, 90)}
    brier = defaultdict(float)
    counts = defaultdict(int)
    rel_records = defaultdict(list)   # phase -> [(p_class, hit)]
    rel_all = []
    used = dropped = 0

    for m in matches:
        if m.d < CUTOFF:
            continue
        key = (m.d.isoformat(), m.home, m.away)
        ev = events.get(key)
        if ev is None:
            dropped += 1
            continue
        # reconstruction integrity: replayed 90' score must equal results.csv
        rec = score_at(ev, 90)
        if rec != final[key]:
            dropped += 1
            continue
        lm = ratings.lambdas(m.home, m.away, m.neutral)
        if lm is None:
            dropped += 1
            continue
        lam_h, lam_a = lm
        outcome = 0 if m.hs > m.aws else 1 if m.hs == m.aws else 2
        y = [0, 0, 0]; y[outcome] = 1
        used += 1
        for minute in PROBES:
            ch, ca = score_at(ev, minute)
            p = live_probs(lam_h, lam_a, ch, ca, minute)
            ph_name = next(n for n, (lo, hi) in phases.items() if lo <= minute <= hi)
            brier[ph_name] += sum((p[k] - y[k]) ** 2 for k in range(3))
            counts[ph_name] += 1
            for k in range(3):
                rel_records[ph_name].append((p[k], y[k]))
                rel_all.append((p[k], y[k]))

    print(f"matches used {used:,}  (dropped {dropped:,}: no events / ET / unknown team)\n")
    print(f"{'phase':<14}{'probes':>8}{'Brier':>10}{'ECE':>8}")
    print("-" * 40)
    for ph in phases:
        if not counts[ph]:
            continue
        ece, _ = _reliability(rel_records[ph])
        print(f"{ph:<14}{counts[ph]:>8}{brier[ph]/counts[ph]:>10.4f}{ece:>8.3f}")
    ece_all, table = _reliability(rel_all)
    print(f"{'ALL':<14}{sum(counts.values()):>8}"
          f"{sum(brier.values())/max(sum(counts.values()),1):>10.4f}{ece_all:>8.3f}")

    print("\nreliability (pooled over all classes & probes):")
    print(f"  {'pred bin':<14}{'n':>8}{'mean pred':>11}{'empirical':>11}")
    for lo, hi, c, mp, my in table:
        flag = "" if abs(mp - my) < 0.03 else "  <- off"
        print(f"  {f'{lo:.1f}-{hi:.1f}':<14}{c:>8}{mp:>11.3f}{my:>11.3f}{flag}")

    print("\nread: low Brier in the LATE phase + ECE small across bins = the "
          "time-scaling in-play model is calibrated -> Edge B's modeling half is alive.")


if __name__ == "__main__":
    _main()
