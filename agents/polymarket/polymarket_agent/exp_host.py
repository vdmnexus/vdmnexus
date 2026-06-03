"""Experiment #2 — host advantage at "neutral" World Cup venues.

`backtest_wc.py` scores every World Cup match as neutral, which throws away a
real edge: the host nation plays at home — home crowd, no travel, familiar
conditions. Grok's research puts the host edge at +8-15% win probability, and
it matters a lot for 2026 because USA, Mexico and Canada ALL host.

The model already fits a global `home_adv` term from non-neutral internationals.
The honest hypothesis here needs no new parameter and no test-set tuning: apply
that already-fitted home edge to the host's own matches and ask whether the
World Cup hold-out improves. Fraction 1.0 (the model's own estimate of a full
home edge) is the primary test; we also print 0.5 as a sensitivity check, since
a WC home crowd may be weaker than a qualifier at the national stadium.

Caveat on power: the hold-out has single hosts (Russia 2018 reached the QF,
Qatar 2022 went out in the group), so only ~8 of 128 games change. Read the
combined number as directional evidence for the 2026 three-host case, not a
high-power result.

Run:  python -m polymarket_agent.exp_host
"""

from __future__ import annotations

import math
from datetime import date

import numpy as np

from .calibrate import Ratings, fifa_member_teams, fit_ratings, load_results
from .backtest_wc import TOURNAMENTS, _outcome, _rps
from .model import ScorelineModel

# Host nation -> team name as it appears in results.csv (identical here).
HOST_TEAM = {2018: "Russia", 2022: "Qatar"}


def host_lambdas(r: Ratings, home, away, host, frac):
    """λ for a neutral-venue match, but give the host its fitted home edge."""
    if home not in r.index or away not in r.index:
        return None
    h, a = r.index[home], r.index[away]
    bonus_h = r.home_adv * frac if home == host else 0.0
    bonus_a = r.home_adv * frac if away == host else 0.0
    lam = math.exp(r.intercept + r.attack[h] - r.defence[a] + bonus_h)
    mu = math.exp(r.intercept + r.attack[a] - r.defence[h] + bonus_a)
    return lam, mu


def _probs(lm):
    rr = ScorelineModel(*lm).match_result()
    return np.array([rr["home"], rr["draw"], rr["away"]])


def backtest_year(matches, year, fracs):
    start, end, _host = TOURNAMENTS[year]
    host = HOST_TEAM[year]
    train = [m for m in matches if m.d < start]
    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    r = fit_ratings(train, ref_day=start, eligible=eligible)

    base = np.zeros(3)
    for m in test:
        base[_outcome(m.hs, m.aws)] += 1
    base = base / base.sum()

    # rps_model accumulator per fraction; rps_base shared
    rps = {f: 0.0 for f in fracs}
    rps_b = 0.0
    n = 0
    host_games = []
    for m in test:
        out = _outcome(m.hs, m.aws)
        involves_host = host in (m.home, m.away)
        lm0 = host_lambdas(r, m.home, m.away, host, 0.0)
        if lm0 is None:
            continue
        rps_b += _rps(base, out)
        for f in fracs:
            lm = host_lambdas(r, m.home, m.away, host, f)
            rps[f] += _rps(_probs(lm), out)
        if involves_host:
            p0 = _probs(host_lambdas(r, m.home, m.away, host, 0.0))
            p1 = _probs(host_lambdas(r, m.home, m.away, host, 1.0))
            host_side = "home" if m.home == host else "away"
            host_games.append((m, host_side, p0, p1, out))
        n += 1

    return {"year": year, "n": n, "home_adv": r.home_adv,
            "rps": rps, "rps_b": rps_b, "host_games": host_games}


def _main() -> None:
    matches = load_results()
    print(f"loaded {len(matches):,} internationals\n")
    print("Experiment #2 — apply fitted home edge to the host nation's games.")
    print("Primary test: fraction 1.0 (full fitted home_adv). No test-set tuning.\n")

    fracs = [0.0, 0.5, 1.0]
    agg_m = {f: 0.0 for f in fracs}
    agg_b = 0.0
    agg_n = 0
    for year in sorted(TOURNAMENTS):
        res = backtest_year(matches, year, fracs)
        print(f"=== {year} World Cup (host {HOST_TEAM[year]}, "
              f"fitted home_adv={res['home_adv']:.3f}) ===")
        for f in fracs:
            skill = 1 - res["rps"][f] / res["rps_b"]
            tag = "  <- neutral baseline" if f == 0.0 else ""
            print(f"  host-edge x{f:<4}  RPS skill {skill*100:+.1f}%{tag}")
        print(f"  host's own games ({len(res['host_games'])}):")
        for m, side, p0, p1, out in res["host_games"]:
            opp = m.away if side == "home" else m.home
            res_str = ["W", "D", "L"][out if side == "home" else (2 - out if out != 1 else 1)]
            print(f"    vs {opp:<16} {m.hs}-{m.aws}  "
                  f"P(host win) {p0[0 if side=='home' else 2]:.2f} -> "
                  f"{p1[0 if side=='home' else 2]:.2f}  (actual {res_str})")
        print()
        for f in fracs:
            agg_m[f] += res["rps"][f]
        agg_b += res["rps_b"]
        agg_n += res["n"]

    print(f"=== combined 2018 + 2022 ({agg_n} games) ===")
    base_skill = 1 - agg_m[0.0] / agg_b
    for f in fracs:
        skill = 1 - agg_m[f] / agg_b
        delta = (skill - base_skill) * 100
        tag = "  (neutral baseline)" if f == 0.0 else f"  {delta:+.2f} pts vs neutral"
        print(f"  host-edge x{f:<4}  RPS skill {skill*100:+.1f}%{tag}")
    best = max(fracs, key=lambda f: 1 - agg_m[f] / agg_b)
    full_delta = (1 - agg_m[1.0] / agg_b - base_skill) * 100
    print(f"\n  verdict: full host edge {'+' if full_delta>=0 else ''}{full_delta:.2f} pts  "
          f"[{'KEEP' if full_delta > 0 else 'DROP'}]")


if __name__ == "__main__":
    _main()
