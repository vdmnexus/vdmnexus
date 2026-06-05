"""Monte-Carlo simulation of the 2026 World Cup -> champion probabilities.

Wraps the calibrated Dixon-Coles ratings (calibrate.py) and the scoreline
engine (model.py) in the *real* 2026 tournament structure: the actual group
draw, FIFA group tiebreakers, the best-eight-third-placed rule, and the
fixed knockout bracket (the published R32 path through to the MetLife final).
Runs thousands of full tournaments and reports how often each team lifts the
trophy, side by side with the live Polymarket outright price so we can read
edge on the first run.

Nothing new is fitted here. This is a simulation layer on top of ratings
that already validate at +24% out-of-sample calibration skill. The match
engine is exactly the one that prices the props — so a sane champion board
is direct evidence the per-match model ranks teams correctly.
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date

import numpy as np

from .calibrate import fifa_member_teams, fit_ratings, load_results
from .roster_talent import load_live_talent
from .exp_travel import VENUE_LATLON, haversine_km
from .model import ScorelineModel

RNG = np.random.default_rng()

# --- 2026 final draw, team names normalised to martj42 results.csv spelling ---
GROUPS: dict[str, list[str]] = {
    "A": ["Mexico", "South Africa", "South Korea", "Czech Republic"],
    "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    "C": ["Brazil", "Morocco", "Haiti", "Scotland"],
    "D": ["United States", "Paraguay", "Australia", "Turkey"],
    "E": ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    "I": ["France", "Senegal", "Iraq", "Norway"],
    "J": ["Argentina", "Algeria", "Austria", "Jordan"],
    "K": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "L": ["England", "Croatia", "Ghana", "Panama"],
}

# Fixed knockout bracket (Wikipedia 2026 knockout stage). Refs:
#   ("W", grp)  group winner      ("RU", grp) group runner-up
#   ("3", slot) best-third in slot ("M", id)   winner of an earlier match
R32: dict[int, tuple] = {
    73: (("RU", "A"), ("RU", "B")),
    74: (("W", "E"), ("3", 74)),
    75: (("W", "F"), ("RU", "C")),
    76: (("W", "C"), ("RU", "F")),
    77: (("W", "I"), ("3", 77)),
    78: (("RU", "E"), ("RU", "I")),
    79: (("W", "A"), ("3", 79)),
    80: (("W", "L"), ("3", 80)),
    81: (("W", "D"), ("3", 81)),
    82: (("W", "G"), ("3", 82)),
    83: (("RU", "K"), ("RU", "L")),
    84: (("W", "H"), ("RU", "J")),
    85: (("W", "B"), ("3", 85)),
    86: (("W", "J"), ("RU", "H")),
    87: (("W", "K"), ("3", 87)),
    88: (("RU", "D"), ("RU", "G")),
}
LATER: dict[int, tuple] = {
    89: (("M", 74), ("M", 77)), 90: (("M", 73), ("M", 75)),
    91: (("M", 76), ("M", 78)), 92: (("M", 79), ("M", 80)),
    93: (("M", 83), ("M", 84)), 94: (("M", 81), ("M", 82)),
    95: (("M", 86), ("M", 88)), 96: (("M", 85), ("M", 87)),
    97: (("M", 89), ("M", 90)), 98: (("M", 93), ("M", 94)),
    99: (("M", 91), ("M", 92)), 100: (("M", 95), ("M", 96)),
    101: (("M", 97), ("M", 98)), 102: (("M", 99), ("M", 100)),
    104: (("M", 101), ("M", 102)),  # final
}

# Which groups' third-placed teams may fill each "3rd place" R32 slot.
THIRD_SLOTS: dict[int, set[str]] = {
    74: set("ABCDF"), 77: set("CDFGH"), 79: set("CEFHI"), 80: set("EHIJK"),
    81: set("BEFIJ"), 82: set("AEHIJ"), 85: set("EFGIJ"), 87: set("DEIJL"),
}


# --- match engine --------------------------------------------------------

# 2026 co-hosts. Unlike a normal World Cup, three nations play on home soil,
# so "all games neutral" is a real mis-spec. Backtest experiment #2
# (exp_host.py, 2026-06-03) validated applying the model's fitted home edge to
# the host nation: the mechanism is sound (Russia 2018 moved the right way;
# Qatar 2022 was a genuine collapse outlier). HOST_EDGE scales the fitted
# home_adv (1.0 = full home edge).
#
# RE-GATE (EXPERIMENTS.md §9, 2026-06-03): on the 4-cup hold-out the FULL host
# edge DROPS (-0.42 pts) — hosts collapse (Brazil 2014, Qatar 2022) as often as
# they shine. The combined ablation only tolerates host when SHRUNK to <=0.33
# (and even then it sits just under talent+travel alone). 2026's three-host,
# always-home structure has no analogue in the single-host hold-out, so we keep
# a small edge but CAP it at the gate-tolerated 0.33 and flag it as not fully
# validated for the 3-host case (parallel to the altitude caveat below).
HOSTS = frozenset({"United States", "Mexico", "Canada"})
HOST_EDGE = 0.33

# --- gated covariate priors (EXPERIMENTS.md #5/#6/#7, RE-GATED §9) ---------
# The COMBINED honesty gate was re-run on the 4-cup hold-out (§9, 2026-06-03)
# and it OVERTURNED the additive three-stack — exactly the Robberechts & Davis
# (mlsa18) caution (their ELO+ODM lost to ELO alone). Verdict:
#   * VALIDATED CORE = talent + travel (+1.26 pts, the winning subset).
#   * host: DROPS at full strength; capped at the gate-tolerated 0.33 above.
#   * altitude: DROPS on the 4-cup gate; kept ONLY as a mechanism-backed,
#     UNVALIDATED Mexico-venue prior (its sole positive evidence is 1970/1986
#     Mexico, outside the hold-out). Flagged, not trusted as a gated feature.
# Each feature is still encoded as the exact log-rate differential it was
# gated with. Do NOT re-add host/altitude to the validated core without a gate.

# (#5) Squad talent — VALIDATED (part of the talent+travel core). FC26 snapshot
# (EA Sports FC 26, fifa_version 26, released 2025-09) is contemporaneous with
# the 2026 cup: lookahead-safe AND current, replacing the ~4yr-stale FIFA 22
# proxy the §8 note flagged. K=23, gated beta≈+0.016. Teams with <11 rated
# FC26 players (Egypt/Iran/Jordan/Uzbekistan) abstain -> talent differential 0.
FIFA_TALENT_YEAR = 2026
TALENT_K = 23
USE_TALENT = True
# Use the GATE-VALIDATED beta as a fixed prior, NOT a fresh joint refit. A live
# refit inflates it (FIFA22 snapshot vs 2024-26 matches is a vintage mismatch
# the backtest never had -> ~+0.043, 2.7x the validated value). The honest
# coefficient is the one that beat climatology out-of-sample.
GATED_BETA_TALENT = 0.016

# (#6) Altitude ascent-penalty — UNVALIDATED on the 4-cup gate (§9: -0.38 pts),
# kept ONLY as a mechanism-backed prior at the high Mexican venues because its
# sole positive evidence (1970/1986 Mexico) sits outside the 2010/14/18/22
# hold-out. beta SHRUNK to +0.13. penalty(team) = max(0, venue_alt -
# base_camp_alt(team))/1000; the side that ascends more is suppressed. Driven
# by 2026 BASE-CAMP altitudes (the user's logistics map). Default OFF in the
# enhanced board so the validated talent(+travel) core stands alone; flip
# USE_ALTITUDE on to price the Mexican high-venue games with the caveat.
BETA_ALT = 0.13
USE_ALTITUDE = False
BASE_CAMP_ALT: dict[str, float] = {  # metres; default 0 (sea-level/US camp)
    "Mexico": 2240,        # Mexico City
    "South Africa": 2432,  # Pachuca — camps HIGHER than Azteca, so unpenalised
    "South Korea": 1566,   # Guadalajara
    "Colombia": 1566,      # Guadalajara
}
# Mexico's three group-A home games are at altitude (Azteca ~2240m). Keyed by
# the unordered pairing so the per-pairing scoreline cache stays valid.
MATCH_VENUE_ALT: dict[frozenset, float] = {
    frozenset({"Mexico", "South Africa"}): 2240.0,
    frozenset({"Mexico", "South Korea"}): 2240.0,
    frozenset({"Mexico", "Czech Republic"}): 2240.0,
}

# (#7) Travel fatigue — VALIDATED (the strongest gated feature, and the other
# half of the talent+travel core; §9 confirmed raw great-circle km beats the
# east-west re-weighting, exp_travel_ew.py). beta≈-0.07. Still DORMANT here:
# it needs each team's match-by-match venue PATH, which only exists once the
# 2026 schedule assigns venues to fixtures. Activates without touching the
# engine the moment that schedule is entered.
BETA_TRAVEL = -0.07
USE_TRAVEL = True  # ACTIVATED: 2026 venue-per-match schedule entered below


# --- 2026 venue-per-match schedule (official FIFA grid, 24 Sep 2024) --------
# The blocker is cleared. Each group's six fixtures are listed in real match
# (chronological) order as (home_idx, away_idx, host_city), with home/away as
# the official schedule lists them and home_idx/away_idx indexing GROUPS[g].
# The city is a VENUE_LATLON key. Travel uses the *unordered* pairing (sorted),
# so it is independent of which side is nominally home; the web score sheet
# uses the real home/away + order. Verified: every group resolves to the
# standard pairing set {(0,1),(2,3),(1,3),(0,2),(0,3),(1,2)} and the cities
# cross-check vs the R32/LATER bracket below.
GROUP_FIXTURES: dict[str, list[tuple[int, int, str]]] = {
    "A": [(0, 1, "Mexico City"), (2, 3, "Guadalajara"),
          (3, 1, "Atlanta"), (0, 2, "Guadalajara"),
          (3, 0, "Mexico City"), (1, 2, "Monterrey")],
    "B": [(0, 1, "Toronto"), (2, 3, "San Francisco Bay Area"),
          (3, 1, "Los Angeles"), (0, 2, "Vancouver"),
          (3, 0, "Vancouver"), (1, 2, "Seattle")],
    "C": [(2, 3, "Boston"), (0, 1, "New York New Jersey"),
          (0, 2, "Philadelphia"), (3, 1, "Boston"),
          (3, 0, "Miami"), (1, 2, "Atlanta")],
    "D": [(0, 1, "Los Angeles"), (2, 3, "Vancouver"),
          (3, 1, "San Francisco Bay Area"), (0, 2, "Seattle"),
          (3, 0, "Los Angeles"), (1, 2, "San Francisco Bay Area")],
    "E": [(2, 3, "Philadelphia"), (0, 1, "Houston"),
          (0, 2, "Toronto"), (3, 1, "Kansas City"),
          (1, 2, "Philadelphia"), (3, 0, "New York New Jersey")],
    "F": [(0, 1, "Dallas"), (2, 3, "Monterrey"),
          (0, 2, "Houston"), (3, 1, "Monterrey"),
          (1, 2, "Dallas"), (3, 0, "Kansas City")],
    "G": [(2, 3, "Los Angeles"), (0, 1, "Seattle"),
          (0, 2, "Los Angeles"), (3, 1, "Vancouver"),
          (1, 2, "Seattle"), (3, 0, "Vancouver")],
    "H": [(2, 3, "Miami"), (0, 1, "Atlanta"),
          (3, 1, "Miami"), (0, 2, "Atlanta"),
          (1, 2, "Houston"), (3, 0, "Guadalajara")],
    "I": [(0, 1, "New York New Jersey"), (2, 3, "Boston"),
          (3, 1, "New York New Jersey"), (0, 2, "Philadelphia"),
          (3, 0, "Boston"), (1, 2, "Toronto")],
    "J": [(0, 1, "Kansas City"), (2, 3, "San Francisco Bay Area"),
          (0, 2, "Dallas"), (3, 1, "San Francisco Bay Area"),
          (1, 2, "Kansas City"), (3, 0, "Dallas")],
    "K": [(0, 1, "Houston"), (2, 3, "Mexico City"),
          (0, 2, "Houston"), (3, 1, "Guadalajara"),
          (3, 0, "Miami"), (1, 2, "Atlanta")],
    "L": [(0, 1, "Dallas"), (2, 3, "Toronto"),
          (0, 2, "Boston"), (3, 1, "Toronto"),
          (3, 0, "New York New Jersey"), (1, 2, "Philadelphia")],
}

# Knockout venue per match id (group-stage travel feeds into these). Bronze
# final (103) is not simulated, so it is omitted.
KO_VENUE: dict[int, str] = {
    73: "Los Angeles", 74: "Boston", 75: "Monterrey", 76: "Houston",
    77: "New York New Jersey", 78: "Dallas", 79: "Mexico City", 80: "Atlanta",
    81: "San Francisco Bay Area", 82: "Seattle", 83: "Toronto",
    84: "Los Angeles", 85: "Vancouver", 86: "Miami", 87: "Kansas City",
    88: "Dallas", 89: "Philadelphia", 90: "Houston",
    91: "New York New Jersey", 92: "Mexico City", 93: "Dallas", 94: "Seattle",
    95: "Atlanta", 96: "Vancouver", 97: "Boston", 98: "Los Angeles",
    99: "Miami", 100: "Kansas City", 101: "Dallas", 102: "Atlanta",
    104: "New York New Jersey",
}


def _build_group_travel():
    """Precompute deterministic group-stage travel.

    GROUP_TD[g][(x,y)]  = cum_km(teams[x]) - cum_km(teams[y]) at the pairing's
                          match (great-circle km flown up to & incl. that leg).
    GROUP_END_TEAM[team] = (cum_km, last_city) after the team's three group
                           games — the start state every team carries into the
                           knockouts. Mirrors exp_travel.compute_travel exactly
                           (first appearance = 0; legs between consecutive
                           venue cities in date/matchday order)."""
    group_td: dict[str, dict[tuple[int, int], float]] = {}
    end_team: dict[str, tuple[float, str | None]] = {}
    for g, teams in GROUPS.items():
        last_city: dict[str, str] = {}
        cum: dict[str, float] = {}
        td: dict[tuple[int, int], float] = {}
        for h, a, city in GROUP_FIXTURES[g]:
            x, y = (h, a) if h < a else (a, h)
            ll = VENUE_LATLON.get(city)
            for idx in (x, y):
                t = teams[idx]
                if ll is not None and t in last_city and last_city[t] in VENUE_LATLON:
                    cum[t] = cum.get(t, 0.0) + haversine_km(
                        VENUE_LATLON[last_city[t]], ll)
                if ll is not None:
                    last_city[t] = city
            td[(x, y)] = cum.get(teams[x], 0.0) - cum.get(teams[y], 0.0)
        group_td[g] = td
        for t in teams:
            end_team[t] = (cum.get(t, 0.0), last_city.get(t))
    return group_td, end_team


GROUP_TD, GROUP_END_TEAM = _build_group_travel()


def _ascent_penalty(team: str, venue_alt: float) -> float:
    return max(0.0, venue_alt - BASE_CAMP_ALT.get(team, 0.0)) / 1000.0


class Engine:
    """Caches the scoreline distribution per ordered pairing so 20k sims
    don't rebuild the same 11x11 matrix millions of times."""

    def __init__(self, ratings, host_edge: float = HOST_EDGE,
                 talent: dict | None = None, beta_talent: float | None = None,
                 altitude: bool = USE_ALTITUDE, beta_travel: float = 0.0,
                 travel: bool = False):
        self.r = ratings
        self.idx = ratings.index
        self.att = ratings.attack
        self.dfc = ratings.defence
        self.c = ratings.intercept
        self.home_adv = ratings.home_adv
        self.host_edge = host_edge
        # Talent (#5): applied as a FIXED gate-validated prior on top of the
        # baseline strengths (explicit beta_talent), not a per-fit refit.
        self.talent = talent or {}
        self.beta_talent = (beta_talent if beta_talent is not None
                            else float(getattr(ratings, "beta_talent", 0.0)))
        # Altitude (#6): per-engine so a clean baseline can switch it off.
        self.altitude = altitude
        # Travel (#7): per-engine; td_travel is supplied per match by the
        # tournament loop from the precomputed 2026 schedule paths.
        self.beta_travel = beta_travel
        self.travel = travel
        self._cache: dict[tuple, tuple] = {}

    def _lambdas(self, a: str, b: str, td_travel: float = 0.0) -> tuple[float, float]:
        ia, ib = self.idx.get(a), self.idx.get(b)
        aa = self.att[ia] if ia is not None else 0.0
        da = self.dfc[ia] if ia is not None else 0.0
        ab = self.att[ib] if ib is not None else 0.0
        db = self.dfc[ib] if ib is not None else 0.0
        # Host edge: a co-host playing at home gets its fitted home advantage.
        ha = self.home_adv * self.host_edge if a in HOSTS else 0.0
        hb = self.home_adv * self.host_edge if b in HOSTS else 0.0
        # Talent differential (#5): suppressed when either side is unknown.
        ta, tb = self.talent.get(a), self.talent.get(b)
        td = (ta - tb) if (ta is not None and tb is not None) else 0.0
        tlt = self.beta_talent * td
        # Altitude ascent-penalty differential (#6): the side that ascends
        # more is suppressed. Non-zero only at mapped high Mexican venues.
        alt = 0.0
        if self.altitude:
            va = MATCH_VENUE_ALT.get(frozenset({a, b}), 0.0)
            if va > 0.0:
                alt = BETA_ALT * (_ascent_penalty(b, va) - _ascent_penalty(a, va))
        # Travel differential (#7): the side that has flown more is suppressed
        # (beta_travel < 0). td_travel is already in /1000-km units.
        trv = self.beta_travel * td_travel
        lam = float(np.exp(self.c + aa - db + ha + tlt + alt + trv))
        mu = float(np.exp(self.c + ab - da + hb - tlt - alt - trv))
        return lam, mu

    def _dist(self, a: str, b: str, td_travel: float = 0.0):
        # Bucket td to 0.1 (=100 km) so the scoreline cache stays effective.
        key = (a, b, round(td_travel, 1))
        hit = self._cache.get(key)
        if hit is not None:
            return hit
        lam, mu = self._lambdas(a, b, td_travel)
        mat = np.asarray(ScorelineModel(lam, mu).matrix, dtype=float)
        n = mat.shape[0]
        cum = np.cumsum(mat.ravel())
        cum /= cum[-1]
        val = (cum, n, lam, mu)
        self._cache[key] = val
        return val

    def score(self, a: str, b: str, td_travel: float = 0.0) -> tuple[int, int]:
        cum, n, _, _ = self._dist(a, b, td_travel)
        k = int(np.searchsorted(cum, RNG.random()))
        return divmod(k, n)

    def knockout_winner(self, a: str, b: str, td_travel: float = 0.0) -> str:
        i, j = self.score(a, b, td_travel)
        if i > j:
            return a
        if j > i:
            return b
        # Penalties: near coin-flip, mildly skewed toward the stronger side.
        _, _, lam, mu = self._dist(a, b, td_travel)
        share = lam / (lam + mu)
        p_a = 0.5 + (share - 0.5) * 0.6
        return a if RNG.random() < p_a else b


# --- tournament ----------------------------------------------------------

def _assign_thirds(qualified: list[str]) -> dict[int, str]:
    """Bipartite-match the 8 qualifying third-placed *groups* to the 8 R32
    third slots, respecting each slot's eligibility (mirrors FIFA's lookup
    table without hardcoding all 495 rows)."""
    slots = list(THIRD_SLOTS)
    slot_to_group: dict[int, str] = {}

    def aug(g: str, seen: set[int]) -> bool:
        for s in slots:
            if g in THIRD_SLOTS[s] and s not in seen:
                seen.add(s)
                if s not in slot_to_group or aug(slot_to_group[s], seen):
                    slot_to_group[s] = g
                    return True
        return False

    order = list(qualified)
    RNG.shuffle(order)
    for g in order:
        aug(g, set())
    # Fallback: drop any group that couldn't be placed into a free slot.
    placed = set(slot_to_group.values())
    leftover_g = [g for g in qualified if g not in placed]
    leftover_s = [s for s in slots if s not in slot_to_group]
    for s, g in zip(leftover_s, leftover_g):
        slot_to_group[s] = g
    return slot_to_group


def played_group_results(
        matches) -> dict[str, dict[tuple[int, int], tuple[int, int]]]:
    """Real WC group-stage scores, keyed group -> sorted (x, y) index pair ->
    (goals_x, goals_y). Lets the live board PIN completed games instead of
    re-simulating them, so the projection adapts as results land. Empty until
    the group stage starts; `matches` is the load_results() output (played
    games only — future fixtures are dropped there)."""
    where = {t: (g, i) for g, ts in GROUPS.items() for i, t in enumerate(ts)}
    out: dict[str, dict[tuple[int, int], tuple[int, int]]] = {}
    for m in matches:
        # The 2026 edition only — without the year bound an ancient WC meeting
        # between two teams that happen to share a 2026 group would be pinned.
        if m.tournament != "FIFA World Cup" or m.d.year != 2026:
            continue
        ph, pa = where.get(m.home), where.get(m.away)
        if ph is None or pa is None or ph[0] != pa[0]:
            continue  # not a same-group 2026 group fixture
        g, ih, ia = ph[0], ph[1], pa[1]
        if ih < ia:
            out.setdefault(g, {})[(ih, ia)] = (m.hs, m.aws)
        else:
            out.setdefault(g, {})[(ia, ih)] = (m.aws, m.hs)
    return out


def _sim_group(eng: Engine, g: str, teams: list[str], pinned=None):
    pts: dict[str, int] = defaultdict(int)
    gd: dict[str, int] = defaultdict(int)
    gf: dict[str, int] = defaultdict(int)
    td_map = GROUP_TD[g] if eng.travel else None
    for x in range(4):
        for y in range(x + 1, 4):
            a, b = teams[x], teams[y]
            pin = pinned.get((x, y)) if pinned else None
            if pin is not None:
                i, j = pin  # real result — do not re-simulate
            else:
                td = (td_map[(x, y)] / 1000.0) if td_map is not None else 0.0
                i, j = eng.score(a, b, td)
            gf[a] += i; gf[b] += j
            gd[a] += i - j; gd[b] += j - i
            if i > j:
                pts[a] += 3
            elif j > i:
                pts[b] += 3
            else:
                pts[a] += 1; pts[b] += 1
    # FIFA order: points, goal difference, goals for, then (approx) random.
    ranked = sorted(teams, key=lambda t: (pts[t], gd[t], gf[t], RNG.random()),
                    reverse=True)
    return ranked, pts, gd, gf


def _play_tournament(eng: Engine, pinned=None) -> dict:
    """One full tournament. Returns the teams reaching each stage so the board
    can aggregate advancement, not just the champion. `pinned` maps group ->
    {(x, y): (gx, gy)} of real results to lock in (see played_group_results)."""
    winners: dict[str, str] = {}
    runners: dict[str, str] = {}
    third_stat: list[tuple] = []  # (pts, gd, gf, rand, group, team)
    third_team: dict[str, str] = {}

    for g, teams in GROUPS.items():
        ranked, pts, gd, gf = _sim_group(
            eng, g, teams, pinned.get(g) if pinned else None)
        winners[g] = ranked[0]
        runners[g] = ranked[1]
        t = ranked[2]
        third_team[g] = t
        third_stat.append((pts[t], gd[t], gf[t], RNG.random(), g, t))

    # Best 8 of the 12 third-placed teams advance.
    third_stat.sort(reverse=True)
    qualified_groups = [row[4] for row in third_stat[:8]]
    slot_group = _assign_thirds(qualified_groups)

    mwin: dict[int, str] = {}

    def team_of(ref) -> str:
        kind, val = ref
        if kind == "W":
            return winners[val]
        if kind == "RU":
            return runners[val]
        if kind == "M":
            return mwin[val]
        # "3": val is a slot id -> group -> that group's third-placed team
        return third_team[slot_group[val]]

    # Knockout travel (#7): thread each surviving team's cumulative path from
    # its group end-state through the fixed KO venues. td is deterministic per
    # match only after the bracket fills, so it must be computed live here.
    state: dict[str, list] | None = None
    if eng.travel:
        state = {t: [c, lc] for t, (c, lc) in GROUP_END_TEAM.items()}
    for mid in sorted(R32) + sorted(LATER):
        ra, rb = (R32.get(mid) or LATER[mid])
        a, b = team_of(ra), team_of(rb)
        td = 0.0
        if state is not None:
            city = KO_VENUE[mid]
            ll = VENUE_LATLON.get(city)
            for t in (a, b):
                st = state[t]
                if ll is not None and st[1] in VENUE_LATLON:
                    st[0] += haversine_km(VENUE_LATLON[st[1]], ll)
                if ll is not None:
                    st[1] = city
            td = (state[a][0] - state[b][0]) / 1000.0
        mwin[mid] = eng.knockout_winner(a, b, td)

    return {
        "winners": winners,
        "runners": runners,
        # 32 teams out of the group (each R32 ref resolves to one team)
        "r32": [team_of(ref) for mid in R32 for ref in R32[mid]],
        "r16": [mwin[m] for m in range(73, 89)],   # won R32 -> round of 16
        "qf": [mwin[m] for m in range(89, 97)],     # won R16 -> quarterfinal
        "sf": [mwin[m] for m in range(97, 101)],    # won QF  -> semifinal
        "final": [mwin[101], mwin[102]],            # won SF  -> final
        "champ": mwin[104],
    }


def simulate_once(eng: Engine, pinned=None) -> str:
    return _play_tournament(eng, pinned)["champ"]


def run(n_sims: int, eng: Engine, pinned=None) -> dict[str, float]:
    champ: dict[str, int] = defaultdict(int)
    for _ in range(n_sims):
        champ[_play_tournament(eng, pinned)["champ"]] += 1
    return {t: c / n_sims for t, c in
            sorted(champ.items(), key=lambda kv: kv[1], reverse=True)}


def run_detail(n_sims: int, eng: Engine, pinned=None) -> list[dict]:
    """Per-team progression probabilities over `n_sims` tournaments. Stages:
    win_group, adv (out of group), r16, qf, sf, final, champ. Sorted by champ."""
    stages = ("adv", "r16", "qf", "sf", "final", "champ")
    cnt: dict[str, dict[str, int]] = {s: defaultdict(int) for s in stages}
    win_group: dict[str, int] = defaultdict(int)
    for _ in range(n_sims):
        d = _play_tournament(eng, pinned)
        for t in set(d["r32"]):
            cnt["adv"][t] += 1
        for t in d["r16"]:
            cnt["r16"][t] += 1
        for t in d["qf"]:
            cnt["qf"][t] += 1
        for t in d["sf"]:
            cnt["sf"][t] += 1
        for t in d["final"]:
            cnt["final"][t] += 1
        cnt["champ"][d["champ"]] += 1
        for t in d["winners"].values():
            win_group[t] += 1

    group_of = {t: g for g, ts in GROUPS.items() for t in ts}
    board = [{
        "team": t,
        "group": group_of[t],
        "win_group": win_group[t] / n_sims,
        "adv": cnt["adv"][t] / n_sims,
        "r16": cnt["r16"][t] / n_sims,
        "qf": cnt["qf"][t] / n_sims,
        "sf": cnt["sf"][t] / n_sims,
        "final": cnt["final"][t] / n_sims,
        "champ": cnt["champ"][t] / n_sims,
    } for t in group_of]
    board.sort(key=lambda r: (r["champ"], r["final"], r["sf"], r["adv"]),
               reverse=True)
    return board


# --- live Polymarket outright prices (optional, for the edge read) -------

_PM_NAME = {
    "USA": "United States", "Turkiye": "Turkey", "Czechia": "Czech Republic",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
    "Cote d'Ivoire": "Ivory Coast", "Côte d'Ivoire": "Ivory Coast",
    "Curacao": "Curaçao", "South Korea": "South Korea",
}


def _gamma(path: str, params: dict) -> list:
    url = "https://gamma-api.polymarket.com" + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "vdm-sim/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def fetch_outright_prices() -> dict[str, float]:
    try:
        evs = _gamma("/events", {"closed": "false", "limit": 200,
                                 "order": "volume", "ascending": "false"})
    except Exception:
        return {}
    ev = next((e for e in evs if "world cup winner" in e.get("title", "").lower()), None)
    if not ev:
        return {}
    out: dict[str, float] = {}
    for m in ev.get("markets", []):
        mm = re.search(r"Will (.+?) win the", m.get("question", ""))
        if not mm:
            continue
        name = _PM_NAME.get(mm.group(1).strip(), mm.group(1).strip())
        price = None
        op = m.get("outcomePrices")
        if op:
            try:
                price = float(json.loads(op)[0])
            except Exception:
                price = None
        if price is None and m.get("lastTradePrice") is not None:
            price = float(m["lastTradePrice"])
        if price is not None:
            out[name] = price
    return out


def _main() -> None:
    import sys
    n_sims = int(sys.argv[1]) if len(sys.argv) > 1 else 20000
    host_edge = float(sys.argv[2]) if len(sys.argv) > 2 else HOST_EDGE

    matches = load_results()
    today = date.today()
    eligible = fifa_member_teams(matches, since=date(2018, 1, 1))

    # One baseline strength fit. Talent (#5) and altitude (#6) are layered on
    # the SAME ratings as fixed gate-validated priors (not refit), so the
    # enhanced board differs from baseline only by the validated covariates.
    ratings = fit_ratings(matches, ref_day=today, eligible=eligible)
    talent = load_live_talent(FIFA_TALENT_YEAR) if USE_TALENT else {}

    # Baseline = strength + host only. Enhanced = + the VALIDATED core (talent;
    # travel when the schedule activates it). Altitude is OFF by default (§9
    # dropped it on the gate) — flip USE_ALTITUDE to add the flagged Mexico prior.
    eng_base = Engine(ratings, host_edge=host_edge, altitude=False)
    eng = Engine(ratings, host_edge=host_edge, talent=talent,
                 beta_talent=GATED_BETA_TALENT if USE_TALENT else 0.0,
                 altitude=USE_ALTITUDE,
                 beta_travel=BETA_TRAVEL if USE_TRAVEL else 0.0,
                 travel=USE_TRAVEL)

    missing = [t for grp in GROUPS.values() for t in grp if t not in ratings.index]
    if missing:
        print(f"note: {len(missing)} teams not in ratings (replacement-level): {missing}")

    feats = []
    if host_edge:
        feats.append(f"host x{host_edge:.2f} (home_adv={ratings.home_adv:.3f})")
    if USE_TALENT:
        feats.append(f"talent #5 (FC{FIFA_TALENT_YEAR % 100} K={TALENT_K}, "
                     f"gated beta={GATED_BETA_TALENT:+.4f})")
    if USE_ALTITUDE:
        feats.append(f"altitude #6 UNVALIDATED prior (beta={BETA_ALT:+.2f}, "
                     f"{len(MATCH_VENUE_ALT)} MEX games)")
    else:
        feats.append("altitude #6 OFF (dropped on 4-cup gate §9)")
    if USE_TRAVEL:
        feats.append(f"travel #7 LIVE (beta={BETA_TRAVEL:+.2f}, 2026 schedule)")
    else:
        feats.append("travel #7 DORMANT (needs 2026 venue schedule)")
    print("features:", "; ".join(feats))
    print(f"simulating {n_sims:,} tournaments on the real 2026 draw "
          f"(baseline vs enhanced)...\n")

    probs_base = run(n_sims, eng_base)
    probs = run(n_sims, eng)
    prices = fetch_outright_prices()

    # Before/after on the two canonical cases: France (talent blind-spot) and
    # Mexico (host + altitude). Positive delta = the covariates lifted them.
    print("before/after (enhanced − baseline champion %):")
    for team in ("France", "Mexico"):
        b, e = probs_base.get(team, 0.0), probs.get(team, 0.0)
        mk = prices.get(team)
        mktxt = f"  market {mk*100:.1f}%" if mk is not None else ""
        print(f"  {team:<8} {b*100:5.1f}% -> {e*100:5.1f}%  "
              f"({(e-b)*100:+.1f} pts){mktxt}")
    print()

    print(f"{'team':<22}{'model':>8}{'market':>9}{'edge':>9}")
    print("-" * 48)
    for team, p in list(probs.items())[:24]:
        mk = prices.get(team)
        if mk is None:
            print(f"{team:<22}{p*100:>7.1f}%{'—':>9}{'—':>9}")
        else:
            edge = p - mk
            print(f"{team:<22}{p*100:>7.1f}%{mk*100:>8.1f}%{edge*100:>+8.1f}%")
    if prices:
        print("\nedge = model% − market%.  positive = model says the market "
              "underprices this team (candidate value).")
    else:
        print("\n(no live Polymarket prices fetched — model column only)")


if __name__ == "__main__":
    _main()
