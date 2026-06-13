"""Live calibration ledger — how the model's pre-match calls hold up in 2026.

DISPLAY / ANALYSIS ONLY. This does NOT feed the model (the model adapts on
results via the daily refit + pinning, not on this file). It scores the model's
pre-tournament per-fixture probabilities (exports/scores.json) against the
actual scorelines logged in refdata/wc26_played.csv as each match is played,
and accumulates Ranked Probability Score (RPS, lower=better) vs a climatology
baseline — the same metric the backtest gate uses. The running gap is the live
read on whether the +14.8% held-out backtest skill is holding up in the cup.

Append a row to wc26_played.csv after each match, then run:
    python3 -m polymarket_agent.wc26_calibrate
Writes exports/wc26_calibration.csv and prints a summary.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAYED = ROOT / "refdata" / "wc26_played.csv"
SCORES = ROOT / "exports" / "scores.json"
OUT = ROOT / "exports" / "wc26_calibration.csv"

# Fixed home/draw/away climatology prior for the baseline (hosts play home,
# most other venues neutral). Stable reference point, not fit to results.
CLIMATOLOGY = (0.40, 0.28, 0.32)


def _outcome(hg: int, ag: int) -> int:
    return 0 if hg > ag else 1 if hg == ag else 2


def _rps(p: tuple[float, float, float], outcome: int) -> float:
    """RPS over ordered [home, draw, away]; lower is better."""
    o = [0.0, 0.0, 0.0]
    o[outcome] = 1.0
    cp = [p[0], p[0] + p[1]]
    co = [o[0], o[0] + o[1]]
    return 0.5 * ((cp[0] - co[0]) ** 2 + (cp[1] - co[1]) ** 2)


def _fixture_index(scores: dict) -> dict:
    fx = {}
    for g in scores["groups"]:
        for f in g["fixtures"]:
            fx[(f["home"], f["away"])] = f
            fx[(f["away"], f["home"])] = f
    return fx


def run() -> None:
    scores = json.loads(SCORES.read_text(encoding="utf-8"))
    fx = _fixture_index(scores)
    played = list(csv.DictReader(PLAYED.open(encoding="utf-8")))

    rows = []
    sum_model = sum_clim = 0.0
    n = correct = 0
    for r in played:
        h, a = r["home"], r["away"]
        hg, ag = int(r["hg"]), int(r["ag"])
        f = fx.get((h, a))
        if not f:
            print(f"  ! no model fixture for {h} v {a} (name mismatch?)")
            continue
        # orient model wdl to the listed home team
        wdl = f["wdl"] if f["home"] == h else f["wdl"][::-1]
        s = sum(wdl) or 1
        p = (wdl[0] / s, wdl[1] / s, wdl[2] / s)  # home/draw/away
        out = _outcome(hg, ag)
        rps_m = _rps(p, out)
        # Fixed climatology prior (home/draw/away). A stable, non-circular
        # baseline — NOT the in-sample base rate, which at small n is both
        # circular (it sees the result) and noisy. Skill vs this firms up as
        # matches accumulate; ignore it over the first handful of games.
        rps_c = _rps(CLIMATOLOGY, out)

        pick_ok = (max(range(3), key=lambda i: p[i]) == out)
        correct += int(pick_ok)
        sum_model += rps_m
        sum_clim += rps_c
        n += 1
        rows.append({
            "match": r["match"], "group": r["group"],
            "fixture": f"{h} {hg}-{ag} {a}",
            "model_pick": "H" if p[0] == max(p) else "D" if p[1] == max(p) else "A",
            "model_pct": f"{round(p[0]*100)}/{round(p[1]*100)}/{round(p[2]*100)}",
            "outcome": "H" if out == 0 else "D" if out == 1 else "A",
            "hit": "Y" if pick_ok else "N",
            "rps_model": round(rps_m, 4),
            "rps_clim": round(rps_c, 4),
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    skill = 1 - sum_model / sum_clim if sum_clim else 0.0
    print(f"matches scored: {n}")
    print(f"outright pick accuracy: {correct}/{n} ({correct/n*100:.0f}%)")
    print(f"mean RPS  model {sum_model/n:.4f}  |  climatology {sum_clim/n:.4f}")
    print(f"RPS skill vs climatology: {skill*100:+.1f}%  "
          f"({'model ahead' if skill > 0 else 'BEHIND baseline'})")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    run()
