"""Export the 2026 group-stage exact-scoreline sheet as JSON for the web UI.

This is the data feed behind the `apps/web/app/wc26` page. It runs the SAME
calibrated core the props are priced on — Dixon-Coles strengths + the validated
talent+travel covariates (host capped at 0.33, altitude off) — over all 72
group fixtures, and for each one emits:

  * the EV-optimal scoreline pick (pool_picks.ev_optimal under 4/3/2 scoring),
  * the single most-likely (modal) scoreline,
  * win/draw/loss, expected goals, and the top-3 correct scores,
  * the host city the match is played in (drives the travel differential).

The sheet is deterministic given the model, so the web page reads a static
snapshot rather than calling Python live. Regenerate after any re-fit:

    python3 -m polymarket_agent.export_scores

Writes to agents/polymarket/exports/scores.json (path derived from this
file). This is the canonical snapshot consumed by both the marketing /wc26
route and the dedicated apps/wc (wc.vdmnexus.com) app.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .exp_talent import compute_talent
from .model import ScorelineModel
from .pool_picks import EXACT_PTS, GDIFF_PTS, TEND_PTS, ev_optimal
from .sim import (
    BETA_TRAVEL, FIFA_TALENT_YEAR, GATED_BETA_TALENT, GROUP_FIXTURES, GROUP_TD,
    GROUPS, HOST_EDGE, TALENT_K, USE_ALTITUDE, USE_TALENT, USE_TRAVEL, Engine,
)

OUT_PATH = Path(__file__).resolve().parents[1] / "exports/scores.json"


def _flip(label: str) -> str:
    a, b = label.split("-")
    return f"{b}-{a}"


def build() -> dict:
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

    groups_out = []
    for g, teams in GROUPS.items():
        fixtures = []
        # Real FIFA matchday order with the actual scheduled home/away.
        for hi, ai, city in GROUP_FIXTURES[g]:
            # The scoreline core is symmetric on the sorted pairing; compute it
            # model-home = lower index, then orient to the scheduled home/away.
            x, y = (hi, ai) if hi < ai else (ai, hi)
            a, b = teams[x], teams[y]
            td = (GROUP_TD[g][(x, y)] / 1000.0) if USE_TRAVEL else 0.0
            lam, mu = eng._lambdas(a, b, td)
            m = ScorelineModel(lam, mu)
            mat = np.asarray(m.matrix)
            ev, pi, pj = ev_optimal(mat, EXACT_PTS, GDIFF_PTS, TEND_PTS)
            mi, mj = np.unravel_index(int(mat.argmax()), mat.shape)
            r = m.match_result()
            top = [[lbl, round(p * 100, 1)]
                   for lbl, p in m.correct_score_board(3)]

            flip = hi > ai  # scheduled home is the model-away side
            home, away = teams[hi], teams[ai]
            if flip:
                pick, modal = f"{pj}-{pi}", f"{mj}-{mi}"
                xg = [round(mu, 2), round(lam, 2)]
                wdl = [round(r["away"] * 100), round(r["draw"] * 100),
                       round(r["home"] * 100)]
                top = [[_flip(lbl), p] for lbl, p in top]
            else:
                pick, modal = f"{pi}-{pj}", f"{mi}-{mj}"
                xg = [round(lam, 2), round(mu, 2)]
                wdl = [round(r["home"] * 100), round(r["draw"] * 100),
                       round(r["away"] * 100)]

            fixtures.append({
                "home": home,
                "away": away,
                "city": city,
                "pick": pick,
                "modal": modal,
                "ev": round(float(ev), 2),
                "xg": xg,
                "wdl": wdl,
                "top": top,
            })
        groups_out.append({"group": g, "fixtures": fixtures})

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
        "scoring": {"exact": EXACT_PTS, "gdiff": GDIFF_PTS, "tend": TEND_PTS},
        "features": " + ".join(feats),
        "groups": groups_out,
    }


def _main() -> None:
    data = build()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    n = sum(len(g["fixtures"]) for g in data["groups"])
    print(f"wrote {n} fixtures across {len(data['groups'])} groups -> {OUT_PATH}")


if __name__ == "__main__":
    _main()
