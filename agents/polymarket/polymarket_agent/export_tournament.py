"""Export the 2026 World Cup champion + advancement board as JSON for the web UI.

Companion to export_scores.py. Where that file prices each group fixture, this
one runs the full Monte-Carlo tournament (sim.run_detail) on the SAME calibrated
core — Dixon-Coles strengths + the validated talent+travel covariates — and for
every one of the 48 teams emits how often it:

  * wins its group,
  * advances out of the group (top-2 or best-third),
  * reaches the round of 16 / quarter / semi / final,
  * lifts the trophy,

side by side with the live Polymarket outright price (champion edge) when the
gamma API answers. Completed 2026 group games are PINNED (sim.played_group_results)
so the board adapts as results land instead of re-simulating played matches.

The board is a deterministic snapshot given the model + results, so the web page
reads static JSON rather than calling Python live. Regenerate after any re-fit
or once new results are in:

    python3 -m polymarket_agent.export_tournament [n_sims]

Writes to agents/polymarket/exports/tournament.json (path derived from this
file). This is the canonical snapshot consumed by both the marketing /wc26
route and the dedicated apps/wc (wc.vdmnexus.com) app.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .exp_talent import compute_talent
from .sim import (
    BETA_TRAVEL, FIFA_TALENT_YEAR, GATED_BETA_TALENT, GROUPS, HOST_EDGE,
    TALENT_K, USE_ALTITUDE, USE_TALENT, USE_TRAVEL, Engine, fetch_outright_prices,
    played_group_results, run_detail,
)

OUT_PATH = Path(__file__).resolve().parents[1] / "exports/tournament.json"
N_SIMS = 20000
_PCT_KEYS = ("win_group", "adv", "r16", "qf", "sf", "final", "champ")


def build(n_sims: int = N_SIMS) -> dict:
    matches = load_results()
    today = date.today()
    eligible = fifa_member_teams(matches, since=date(2018, 1, 1))
    ratings = fit_ratings(matches, ref_day=today, eligible=eligible)
    talent = compute_talent(FIFA_TALENT_YEAR, TALENT_K) if USE_TALENT else {}
    eng = Engine(ratings, host_edge=HOST_EDGE, talent=talent,
                 beta_talent=GATED_BETA_TALENT if USE_TALENT else 0.0,
                 altitude=USE_ALTITUDE,
                 beta_travel=BETA_TRAVEL if USE_TRAVEL else 0.0,
                 travel=USE_TRAVEL)

    pinned = played_group_results(matches)
    games_played = sum(len(v) for v in pinned.values())
    board = run_detail(n_sims, eng, pinned or None)

    try:
        prices = fetch_outright_prices()
    except Exception:
        prices = {}

    for row in board:
        for k in _PCT_KEYS:
            row[k] = round(row[k], 4)
        mk = prices.get(row["team"])
        row["market"] = round(mk, 4) if mk is not None else None
        row["edge"] = round(row["champ"] - mk, 4) if mk is not None else None

    feats = []
    if HOST_EDGE:
        feats.append(f"host ×{HOST_EDGE:.2f}")
    if USE_TALENT:
        feats.append(f"squad talent (FC{FIFA_TALENT_YEAR % 100})")
    if USE_TRAVEL:
        feats.append("2026 travel fatigue")
    if USE_ALTITUDE:
        feats.append("Mexico altitude")

    return {
        "generated_at": today.isoformat(),
        "n_sims": n_sims,
        "group_games_played": games_played,
        "features": " + ".join(feats),
        "board": board,
    }


def _main() -> None:
    n_sims = int(sys.argv[1]) if len(sys.argv) > 1 else N_SIMS
    data = build(n_sims)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    top = data["board"][0]
    print(f"wrote {len(data['board'])} teams ({data['n_sims']:,} sims, "
          f"{data['group_games_played']} group games pinned) -> {OUT_PATH}")
    print(f"  leader: {top['team']} champ {top['champ'] * 100:.1f}%")


if __name__ == "__main__":
    _main()
