"""Pre-commit guards for the live World Cup pipeline.

Two failure classes the daily action and code changes must never ship:

  exports  — a malformed regenerate (NaN probs, wrong team/fixture count,
             probabilities that don't sum sanely). FAST. Wired into the daily
             football-ingest action BEFORE the commit step, so a broken
             scores.json / tournament.json can never reach the live site.

  backtest — a code change that silently degrades the model below its honesty
             gate (+14.8% RPS skill vs climatology on 2010/14/18/22). SLOW
             (refits four cups). Run on code changes / pre-deploy, not daily.

Both exit non-zero on failure so CI can gate on them.

    python3 -m polymarket_agent.selfcheck exports
    python3 -m polymarket_agent.selfcheck backtest
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

EXPORTS = Path(__file__).resolve().parents[1] / "exports"

# 2026 format: 48 teams, 12 groups of 4, 6 fixtures per group = 72 group games.
N_TEAMS = 48
N_GROUPS = 12
N_FIXTURES = 72
MIN_SKILL = 0.12  # backtest must stay clear of this (currently ~0.148)


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}")
    sys.exit(1)


def _finite(x) -> bool:
    return isinstance(x, (int, float)) and math.isfinite(x)


def check_exports() -> None:
    scores = json.loads((EXPORTS / "scores.json").read_text(encoding="utf-8"))
    tour = json.loads((EXPORTS / "tournament.json").read_text(encoding="utf-8"))

    # --- scores.json: 12 groups, 72 fixtures, sane per-fixture numbers ---
    groups = scores.get("groups", [])
    if len(groups) != N_GROUPS:
        _fail(f"scores.json: {len(groups)} groups, expected {N_GROUPS}")
    nfix = sum(len(g.get("fixtures", [])) for g in groups)
    if nfix != N_FIXTURES:
        _fail(f"scores.json: {nfix} fixtures, expected {N_FIXTURES}")
    for g in groups:
        for f in g["fixtures"]:
            tag = f"{f.get('home')}-{f.get('away')}"
            wdl = f.get("wdl", [])
            if len(wdl) != 3 or not all(_finite(v) for v in wdl):
                _fail(f"{tag}: bad wdl {wdl}")
            if not (95 <= sum(wdl) <= 105):
                _fail(f"{tag}: wdl sums to {sum(wdl)} (expected ~100)")
            if not all(_finite(v) and 0 <= v < 10 for v in f.get("xg", [])):
                _fail(f"{tag}: xg out of range {f.get('xg')}")

    # --- tournament.json: 48 teams, valid probs, exactly ~1 champion ---
    board = tour.get("board", [])
    if len(board) != N_TEAMS:
        _fail(f"tournament.json: {len(board)} teams, expected {N_TEAMS}")
    stage_keys = ("adv", "r16", "qf", "sf", "final", "champ")
    for r in board:
        for k in stage_keys:
            p = r.get(k)
            if not _finite(p) or not (0.0 <= p <= 1.0001):
                _fail(f"{r.get('team')}: {k}={p} out of [0,1]")
    champ_sum = sum(r["champ"] for r in board)
    if not (0.95 <= champ_sum <= 1.05):
        _fail(f"champ probs sum to {champ_sum:.3f} (expected ~1.0 — one "
              f"champion per sim)")
    final_sum = sum(r["final"] for r in board)
    if not (1.9 <= final_sum <= 2.1):
        _fail(f"final probs sum to {final_sum:.3f} (expected ~2.0 — two "
              f"finalists)")

    print(f"  OK: scores {N_GROUPS} groups / {nfix} fixtures; "
          f"tournament {len(board)} teams; champ sum {champ_sum:.3f}, "
          f"final sum {final_sum:.3f}")


def check_backtest(min_skill: float = MIN_SKILL) -> None:
    from .calibrate import load_results
    from .backtest_wc import TOURNAMENTS, backtest_one

    matches = load_results()
    rm = rb = 0.0
    for year in sorted(TOURNAMENTS):
        r = backtest_one(matches, year)
        rm += r["rps_model"] * r["n"]
        rb += r["rps_base"] * r["n"]
    skill = 1 - rm / rb
    print(f"  4-cup RPS skill vs climatology: {skill*100:+.1f}%")
    if skill < min_skill:
        _fail(f"skill {skill*100:.1f}% below floor {min_skill*100:.0f}% — "
              f"the model regressed; investigate before shipping")
    print(f"  OK: model clears the honesty gate (floor {min_skill*100:.0f}%)")


def _main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "exports"
    if cmd == "exports":
        check_exports()
    elif cmd == "backtest":
        check_backtest()
    else:
        _fail(f"unknown command '{cmd}' (use 'exports' or 'backtest')")


if __name__ == "__main__":
    _main()
