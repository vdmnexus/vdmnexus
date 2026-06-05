"""Home-grown expected-goals model + gateable shot-quality ratings (EXPERIMENT).

STATUS: dormant. `USE_XG = False`. Nothing here is read by `sim.py`. This module
is the gate-ready plumbing for the one xG-style feature that CAN clear the 2018
fold — built so that promotion is a single flag flip + a `regate` run, never a
silent wiring-in of an unvalidated covariate.

Why this exists
---------------
Provider xG (Fotmob, Sofascore's `xg` field) only goes back to ~2022, so an
xG rating cannot be backtested on the 2018 World Cup → ungated (display only;
see PIPELINE.md and `export_profiles.py`). BUT Sofascore exposes the raw shot
*coordinates* + body part + situation for 2018 (and earlier). That lets us fit
our OWN xG model on the full shot corpus and apply the SAME model to 2018 shots —
a synthetic xG that exists for both gate folds.

The model (`refdata/xg_model.json`)
-----------------------------------
Logistic regression, goal ~ f(distance, distance^2, |dy|, shot angle, is_header,
is_penalty, is_setpiece, is_fastbreak), trained on WC2018 + WC2022 + Euro2024
Sofascore shots (4,531 shots). Validation:

  * 5-fold out-of-sample AUC 0.807  (distance-only baseline 0.740)
  * corr(home-grown xG, Sofascore provider xG) = 0.799 on the 2,833 shots that
    have provider xG; total calibration 344 vs 360 (within 5%).

Coefficient signs are all football-sane: penalty +1.83, wide angle +1.30,
header -1.07, set-piece -0.73, fast-break +0.51, distance -0.08.

The gate plan (NOT yet run — see data-depth caveat)
---------------------------------------------------
Each candidate becomes a point-in-time per-team RATING, encoded as a per-match
differential `rating[home] - rating[away]`, fit JOINTLY with the Dixon-Coles
attack/defence in `regate.fit_combo` (identical treatment to `talent`), and KEPT
only if held-out RPS skill beats the strengths-only baseline. Candidates, all
derived from the same Sofascore shot corpus and all present for 2018 + 2022:

  1. home-grown xG rating   (xG-for minus xG-against, decayed)   <- the headline
  2. big-chances rating
  3. shots-on-target rating
  4. through-balls rating    (the one non-shot signal: r=0.42)
  5. set-piece-goal rate
  6. header / aerial rate

Two validation regimes (the user chose BOTH):
  * WC gate     — leave-one-WC-out on 2018 + 2022 (talent-style abstention on
                  2010/2014, which predate Sofascore shot coverage).
  * modern gate — held-out recent tournaments (Euro24, Copa24, AFCON, Nations
                  League, qualifiers) for features that only have 2022+ data;
                  promotes to the LIVE engine, logged "modern-validated".

DATA-DEPTH CAVEAT (the open blocker)
------------------------------------
Building a *point-in-time pre-cup* team rating needs international shot data
BEFORE each opener. ScraperFC-Sofascore international coverage is limited to
FIFA World Cup, UEFA Euro and CONCACAF Gold Cup (NOT Copa/AFCON/Asian Cup/
qualifiers/Nations League/friendlies). So the pre-2018 history is thin (Euro
2016, WC 2014 if shot-mapped) and the 2018-fold rating may abstain for many
teams. The modern gate is far more data-rich. Resolve before the WC-fold run.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

# --- dormant flag: promotion gate, OFF until regate proves it ---------------
USE_XG = False

_MODEL_PATH = Path(__file__).resolve().parents[1] / "refdata" / "xg_model.json"


def load_model() -> dict:
    return json.loads(_MODEL_PATH.read_text(encoding="utf-8"))


def shot_features(x: float, y: float, body_part: str | None,
                  situation: str | None) -> list[float]:
    """Engineer the model's features from a Sofascore shot. Pitch convention:
    goal at (x=0, y=50); normalized 0-100 coords scaled to a 105x68 m pitch."""
    dx = x / 100.0 * 105.0
    dy = (y - 50) / 100.0 * 68.0
    dist = math.hypot(dx, dy)
    angle = math.atan2(7.32 * dx, max(dx * dx + dy * dy - (7.32 / 2) ** 2, 1e-6))
    sit = situation or ""
    return [
        dist, dist * dist, abs(dy), angle,
        1.0 if body_part == "head" else 0.0,
        1.0 if sit == "penalty" else 0.0,
        1.0 if sit in ("corner", "set-piece", "throw-in-set-piece") else 0.0,
        1.0 if sit == "fast-break" else 0.0,
    ]


def xg_of_shot(x: float, y: float, body_part: str | None,
               situation: str | None, model: dict | None = None) -> float:
    """Synthetic expected-goals value for a single shot, from the persisted
    logistic model. Works on 2018 shots (no provider xG needed)."""
    m = model or load_model()
    z = m["intercept"] + sum(c * f for c, f in
                             zip(m["coef"], shot_features(x, y, body_part, situation)))
    return 1.0 / (1.0 + math.exp(-z))
