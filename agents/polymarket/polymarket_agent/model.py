"""Poisson / Dixon-Coles scoreline engine — the prop-pricing core.

Turns two teams' expected goals into a full scoreline distribution, then
marginalises that joint distribution into a fair probability for every
goal-based Polymarket prop: exact score, over/under, both-teams-to-score,
team totals, double chance, and (via player expected goals) anytime
scorer.

The whole edge thesis lives here: retail overbets popular scorelines, so
the tail is softly priced. A calibrated scoreline matrix prices that tail
correctly. LLMs cannot emit calibrated tail probabilities, so this is the
arithmetic the signed-inference layer reasons *on top of* — never instead
of.

Pure stdlib (math only) so it runs anywhere with no install. Calibrating
the ratings->(lambda, mu) mapping against real results is a separate step
(see calibrate.py); this module takes expected goals as given.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

# Truncating the score matrix at 10 goals per side captures >99.999% of the
# probability mass for any realistic football expected-goals value (lambda
# rarely exceeds ~3.5), and the residual is folded back in by renormalising.
MAX_GOALS = 10


def _poisson_pmf(k: int, lam: float) -> float:
    return math.exp(-lam) * lam**k / math.factorial(k)


def _dc_tau(i: int, j: int, lam: float, mu: float, rho: float) -> float:
    """Dixon-Coles low-score dependence correction.

    Independent Poissons systematically misprice 0-0, 1-0, 0-1, 1-1 — the
    exact scores that dominate football and that props key on. rho (~ -0.1)
    pulls those four cells toward empirically observed frequencies.
    """
    if i == 0 and j == 0:
        return 1.0 - lam * mu * rho
    if i == 0 and j == 1:
        return 1.0 + lam * rho
    if i == 1 and j == 0:
        return 1.0 + mu * rho
    if i == 1 and j == 1:
        return 1.0 - rho
    return 1.0


@dataclass
class ScorelineModel:
    """A priced match. `matrix[i][j]` = P(home scores i, away scores j)."""

    lam: float  # home (or team A) expected goals
    mu: float  # away (or team B) expected goals
    rho: float = -0.10
    max_goals: int = MAX_GOALS
    matrix: list[list[float]] = field(default_factory=list)

    def __post_init__(self) -> None:
        n = self.max_goals + 1
        m = [[0.0] * n for _ in range(n)]
        total = 0.0
        for i in range(n):
            pi = _poisson_pmf(i, self.lam)
            for j in range(n):
                p = pi * _poisson_pmf(j, self.mu) * _dc_tau(i, j, self.lam, self.mu, self.rho)
                p = max(p, 0.0)  # tau can push a cell slightly negative at the corners
                m[i][j] = p
                total += p
        # Renormalise: recovers the truncated tail mass and the tau distortion.
        for i in range(n):
            for j in range(n):
                m[i][j] /= total
        self.matrix = m

    # --- match-level markets ---

    def match_result(self) -> dict[str, float]:
        home = draw = away = 0.0
        for i, row in enumerate(self.matrix):
            for j, p in enumerate(row):
                if i > j:
                    home += p
                elif i == j:
                    draw += p
                else:
                    away += p
        return {"home": home, "draw": draw, "away": away}

    def double_chance(self) -> dict[str, float]:
        r = self.match_result()
        return {
            "home_or_draw": r["home"] + r["draw"],
            "away_or_draw": r["away"] + r["draw"],
            "home_or_away": r["home"] + r["away"],
        }

    def exact_score(self, i: int, j: int) -> float:
        if i > self.max_goals or j > self.max_goals:
            return 0.0
        return self.matrix[i][j]

    def correct_score_board(self, top_n: int = 8) -> list[tuple[str, float]]:
        cells = [
            (f"{i}-{j}", self.matrix[i][j])
            for i in range(self.max_goals + 1)
            for j in range(self.max_goals + 1)
        ]
        cells.sort(key=lambda c: c[1], reverse=True)
        return cells[:top_n]

    # --- totals markets ---

    def over_under(self, line: float) -> dict[str, float]:
        """Over/under total match goals at a .5 line (e.g. 2.5)."""
        over = 0.0
        for i, row in enumerate(self.matrix):
            for j, p in enumerate(row):
                if i + j > line:
                    over += p
        return {"over": over, "under": 1.0 - over}

    def team_total_over(self, side: str, line: float) -> float:
        """P(one team scores more than `line` goals). side in {home, away}."""
        idx_is_home = side == "home"
        total = 0.0
        for i, row in enumerate(self.matrix):
            for j, p in enumerate(row):
                goals = i if idx_is_home else j
                if goals > line:
                    total += p
        return total

    def btts(self) -> dict[str, float]:
        yes = 0.0
        for i, row in enumerate(self.matrix):
            for j, p in enumerate(row):
                if i >= 1 and j >= 1:
                    yes += p
        return {"yes": yes, "no": 1.0 - yes}

    def clean_sheet(self, side: str) -> float:
        """P(`side` keeps a clean sheet) = opponent scores 0."""
        if side == "home":
            return sum(self.matrix[i][0] for i in range(self.max_goals + 1))
        return sum(self.matrix[0][j] for j in range(self.max_goals + 1))


# --- player markets ---


def player_expected_goals(team_lambda: float, goal_share: float, expected_minutes: float) -> float:
    """Player expected goals in a match.

    team_lambda      — the team's expected goals (from ScorelineModel input)
    goal_share       — fraction of team goals this player is responsible for
                       when on the pitch (from xG share / goal involvement)
    expected_minutes — projected minutes; the single biggest swing factor
                       and exactly what the LLM team-news read supplies.
    """
    return team_lambda * goal_share * (expected_minutes / 90.0)


def anytime_scorer(player_lambda: float) -> float:
    """P(player scores at least once) under a Poisson goal count."""
    return 1.0 - math.exp(-player_lambda)


def player_over_1_5_goals(player_lambda: float) -> float:
    p0 = math.exp(-player_lambda)
    p1 = player_lambda * math.exp(-player_lambda)
    return 1.0 - p0 - p1


# --- value helpers (used by the value gate) ---


def devig_two_way(price_yes: float, price_no: float) -> tuple[float, float]:
    """Strip the overround from a two-way market to get fair implied probs.

    Polymarket YES+NO prices sum to slightly over 1.0; the excess is the
    vig we must clear to have a real edge.
    """
    total = price_yes + price_no
    if total <= 0:
        return 0.0, 0.0
    return price_yes / total, price_no / total


def edge(model_prob: float, market_price: float) -> float:
    """Raw edge: our fair prob minus what the market charges. >0 = value."""
    return model_prob - market_price


def kelly_fraction(model_prob: float, market_price: float, cap: float = 0.25) -> float:
    """Fractional-Kelly stake as a fraction of bankroll, capped.

    A binary share bought at `market_price` pays out 1.0. Net odds
    b = (1 - price) / price. Kelly f* = (p*b - (1-p)) / b. We return a
    fraction of full Kelly (cap) and never go negative or above the cap.
    """
    if not 0.0 < market_price < 1.0:
        return 0.0
    b = (1.0 - market_price) / market_price
    full = (model_prob * b - (1.0 - model_prob)) / b
    if full <= 0:
        return 0.0
    return min(full * cap, cap)


def _demo() -> None:
    # France (strong) vs a mid-tier side at a neutral World Cup venue.
    # Expected goals here are illustrative — calibrate.py fits these from
    # real ratings. France ~1.9, opponent ~0.85.
    m = ScorelineModel(lam=1.9, mu=0.85)

    print("=== ScorelineModel(lam=1.9, mu=0.85, rho=-0.10) ===\n")

    r = m.match_result()
    print(f"1X2          home {r['home']:.3f}  draw {r['draw']:.3f}  away {r['away']:.3f}"
          f"   (sum {sum(r.values()):.4f})")

    ou = m.over_under(2.5)
    print(f"O/U 2.5      over {ou['over']:.3f}  under {ou['under']:.3f}")
    ou3 = m.over_under(3.5)
    print(f"O/U 3.5      over {ou3['over']:.3f}  under {ou3['under']:.3f}")

    b = m.btts()
    print(f"BTTS         yes  {b['yes']:.3f}  no   {b['no']:.3f}")

    print(f"clean sheet  home {m.clean_sheet('home'):.3f}  away {m.clean_sheet('away'):.3f}")
    print(f"team>1.5      home {m.team_total_over('home', 1.5):.3f}  "
          f"away {m.team_total_over('away', 1.5):.3f}")

    print("\ntop correct scores:")
    for label, p in m.correct_score_board(6):
        print(f"  {label}  {p:.3f}")

    # Anytime scorer: a striker taking ~40% of France's goals, 90 mins.
    pl = player_expected_goals(team_lambda=1.9, goal_share=0.40, expected_minutes=90)
    print(f"\nstriker xG={pl:.3f}  anytime {anytime_scorer(pl):.3f}  "
          f"2+ goals {player_over_1_5_goals(pl):.3f}")
    # Same striker benched to 25 mins — the team-news swing the LLM supplies.
    pl_b = player_expected_goals(team_lambda=1.9, goal_share=0.40, expected_minutes=25)
    print(f"  if benched to 25': xG={pl_b:.3f}  anytime {anytime_scorer(pl_b):.3f}")

    # Value example: suppose Polymarket prices "over 2.5" YES at 0.50 / NO 0.54.
    fair_yes, _ = devig_two_way(0.50, 0.54)
    e = edge(ou["over"], 0.50)
    f = kelly_fraction(ou["over"], 0.50)
    print(f"\nvalue check  model_over={ou['over']:.3f}  price=0.500  "
          f"devig_fair={fair_yes:.3f}  edge={e:+.3f}  kelly={f:.3f}")


if __name__ == "__main__":
    _demo()
