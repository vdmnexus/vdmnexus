"""Re-gate every KEEP feature — individually AND combined — on the expanded
2010 / 2014 / 2018 / 2022 hold-out (Tasks 2 + 3).

Why this module exists separately from the exp_*.py files: each experiment
gated its feature on the hold-out that could SEE it (altitude on 1970/86/2010,
travel leave-one-WC-out, talent/host on 2018/2022). That was correct for
discovery. But the 2026 question needs every surviving feature scored on ONE
consistent four-cup hold-out, and — the load-bearing line — the FULL STACK
scored together, because individually-passing betas are not guaranteed to add
(Robberechts & Davis: ELO+ODM lost to ELO alone). The gate decides, not the
sum of four separate gates.

Honest visibility on the four-cup hold-out (which cup can see which feature):
  * host     — every cup has a host (2010 SA, 2014 BR, 2018 RU, 2022 QA).
  * talent   — FIFA snapshot only exists for 2018 (FIFA18) and 2022 (FIFA22);
               2010/2014 have no contemporaneous game, so talent ABSTAINS there
               (differential = 0, neither helps nor hurts). No lookahead: we do
               NOT use a post-2014 FIFA version to score 2010/2014.
  * altitude — only 2010 has mapped high venues (Johannesburg 1753 ... ). 2014's
               highest venue (Brasília 1172 m) is intentionally left sea-level in
               VENUE_ALT, so altitude abstains on 2014/2018/2022. The Brasília
               caveat is checked separately in `altitude_2014_sensitivity`.
  * travel   — geocoded for all four cups. Two-stage leave-one-WC-out: 2010 has
               no prior geocoded cup so its travel beta is 0 (abstains as a
               target); 2014<-2010, 2018<-2010+14, 2022<-2010+14+18 (degenerate,
               ~0 km differential inside single-city Doha).

Methodology is unchanged and non-negotiable: fit strictly BEFORE each opener,
differential encoding, beta fit JOINTLY with attack/defence for full-history
features (talent, altitude) and two-stage for the within-tournament feature
(travel); host reuses the already-fitted home_adv with no new parameter. RPS
skill vs climatology is the score; sign-stability of each beta across cups is
the signal-vs-noise test.

Run:  python3 -m polymarket_agent.regate
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

import numpy as np
from scipy.optimize import minimize, minimize_scalar

from .calibrate import _importance, fifa_member_teams, fit_ratings, load_results
from .backtest_wc import TOURNAMENTS, _outcome, _rps
from .model import ScorelineModel
from .exp_talent import FIFA_FILE, compute_talent
from .exp_altitude import city_of, load_city_map, penalty, venue_alt
from .exp_travel import WC_WINDOWS, compute_travel

GATE_YEARS = [2010, 2014, 2018, 2022]
HOST_TEAM = {2010: "South Africa", 2014: "Brazil", 2018: "Russia", 2022: "Qatar"}
TALENT_TOPK = 23
TALENT_WINDOW = 365  # days; the gated config from exp_talent (#5)


# --- per-match feature differentials -------------------------------------

def talent_snapshot(year: int) -> dict[str, float]:
    """team -> talent value, only for cups with a contemporaneous FIFA file."""
    return compute_talent(year, TALENT_TOPK) if year in FIFA_FILE else {}


def talent_diff(m, talent: dict[str, float], ref_day: date, window: int) -> float:
    th, ta = talent.get(m.home), talent.get(m.away)
    if th is None or ta is None:
        return 0.0
    if (ref_day - m.d).days > window:
        return 0.0  # snapshot too far from this match -> unknown
    return th - ta  # eta_home += beta*(t_home - t_away); beta>0 favours talent


def alt_diff(m, cities) -> float:
    va = venue_alt(city_of(m, cities))
    if va <= 0.0:
        return 0.0
    # pen_away - pen_home; eta_home += beta*d, beta>0 favours the better-adapted side
    return penalty(m.away, va) - penalty(m.home, va)


# --- joint fit with talent + altitude covariates -------------------------

@dataclass
class ComboRatings:
    attack: np.ndarray
    defence: np.ndarray
    intercept: float
    home_adv: float
    beta_talent: float
    beta_alt: float
    index: dict[str, int]
    teams: list[str]


def fit_combo(matches, ref_day, talent, cities, *, use_talent, use_alt,
              window=TALENT_WINDOW, half_life_days=540.0, min_matches=6,
              ridge=0.05, eligible=None) -> ComboRatings:
    """Joint Poisson MLE: strengths + home_adv + (optionally) talent & altitude
    betas, fit together by L-BFGS-B with analytic gradient. A feature that is
    switched off contributes an all-zero differential, so its beta gradient is
    zero and it stays pinned at 0 — i.e. the fit reduces exactly to the baseline
    or to whichever subset of features is on."""
    counts: dict[str, int] = {}
    for m in matches:
        counts[m.home] = counts.get(m.home, 0) + 1
        counts[m.away] = counts.get(m.away, 0) + 1
    teams = sorted(t for t, c in counts.items()
                   if c >= min_matches and (eligible is None or t in eligible))
    index = {t: i for i, t in enumerate(teams)}
    tset = set(teams)
    ms = [m for m in matches if m.home in tset and m.away in tset]

    n = len(teams)
    decay = math.log(2) / half_life_days
    hi = np.array([index[m.home] for m in ms])
    ai = np.array([index[m.away] for m in ms])
    hs = np.array([m.hs for m in ms], dtype=float)
    aws = np.array([m.aws for m in ms], dtype=float)
    hf = np.array([0.0 if m.neutral else 1.0 for m in ms])
    td = np.array([talent_diff(m, talent, ref_day, window) if use_talent else 0.0
                   for m in ms])
    ad = np.array([alt_diff(m, cities) if use_alt else 0.0 for m in ms])
    w = np.array([_importance(m.tournament) * math.exp(-decay * (ref_day - m.d).days)
                  for m in ms])

    def unpack(p):
        return p[0], p[1], p[2], p[3], p[4:4 + n], p[4 + n:4 + 2 * n]

    def nll_and_grad(p):
        c, gamma, bt, ba, att, dfc = unpack(p)
        eta_h = c + att[hi] - dfc[ai] + gamma * hf + bt * td + ba * ad
        eta_a = c + att[ai] - dfc[hi] - bt * td - ba * ad
        lam_h = np.exp(eta_h)
        lam_a = np.exp(eta_a)
        ll = w * ((hs * eta_h - lam_h) + (aws * eta_a - lam_a))
        nll = -ll.sum() + ridge * (att @ att + dfc @ dfc)
        gh = w * (lam_h - hs)
        ga = w * (lam_a - aws)
        g = np.zeros_like(p)
        g[0] = gh.sum() + ga.sum()
        g[1] = (gh * hf).sum()
        g[2] = ((gh - ga) * td).sum()
        g[3] = ((gh - ga) * ad).sum()
        g_att = np.zeros(n); g_def = np.zeros(n)
        np.add.at(g_att, hi, gh); np.add.at(g_att, ai, ga)
        np.add.at(g_def, ai, -gh); np.add.at(g_def, hi, -ga)
        g[4:4 + n] = g_att + 2 * ridge * att
        g[4 + n:4 + 2 * n] = g_def + 2 * ridge * dfc
        return nll, g

    p0 = np.zeros(4 + 2 * n)
    p0[0] = math.log(1.35); p0[1] = 0.25
    res = minimize(nll_and_grad, p0, jac=True, method="L-BFGS-B",
                   options={"maxiter": 500})
    c, gamma, bt, ba, att, dfc = unpack(res.x)
    att = att - att.mean(); dfc = dfc - dfc.mean()
    return ComboRatings(att, dfc, float(c), float(gamma), float(bt), float(ba),
                        index, teams)


# --- travel beta (two-stage, on top of the combo strengths) --------------

def eta0_combo(cr: ComboRatings, m, talent, cities, ref_day, feats) -> tuple | None:
    """Baseline log-rates from the combo model with talent/altitude/host applied
    (everything EXCEPT travel), used as the fixed offset when fitting beta_travel
    and when scoring. Returns (eta_h, eta_a) or None if a team is unrated."""
    if m.home not in cr.index or m.away not in cr.index:
        return None
    h, a = cr.index[m.home], cr.index[m.away]
    td = talent_diff(m, talent, ref_day, TALENT_WINDOW) if "talent" in feats else 0.0
    ad = alt_diff(m, cities) if "alt" in feats else 0.0
    eta_h = cr.intercept + cr.attack[h] - cr.defence[a] + cr.beta_talent * td + cr.beta_alt * ad
    eta_a = cr.intercept + cr.attack[a] - cr.defence[h] - cr.beta_talent * td - cr.beta_alt * ad
    return eta_h, eta_a


def fit_beta_travel(cr, pool, pool_travel, talent, cities, feats) -> float:
    """1-D Poisson MLE for the travel scalar with the combo prediction held
    fixed. Pool = matches of the prior geocoded WCs (the only place a
    within-tournament travel differential exists)."""
    rows = []
    for m in pool:
        e0 = eta0_combo(cr, m, talent, cities, m.d, feats)
        if e0 is None:
            continue
        tvh, tva = pool_travel[id(m)]
        rows.append((e0[0], e0[1], float(m.hs), float(m.aws), tvh - tva))
    if not rows:
        return 0.0
    eh0 = np.array([r[0] for r in rows]); ea0 = np.array([r[1] for r in rows])
    hs = np.array([r[2] for r in rows]); aws = np.array([r[3] for r in rows])
    tvd = np.array([r[4] for r in rows])

    def nll(beta):
        eta_h = eh0 + beta * tvd
        eta_a = ea0 - beta * tvd
        return -(hs * eta_h - np.exp(eta_h) + aws * eta_a - np.exp(eta_a)).sum()

    return float(minimize_scalar(nll, bounds=(-2.0, 2.0), method="bounded").x)


# --- scoring -------------------------------------------------------------

def score_match(cr, m, talent, cities, beta_travel, travel_d, host, feats,
                host_frac=1.0):
    """Full 1X2 probabilities with the requested feature subset applied."""
    if m.home not in cr.index or m.away not in cr.index:
        return None
    h, a = cr.index[m.home], cr.index[m.away]
    td = talent_diff(m, talent, m.d, TALENT_WINDOW) if "talent" in feats else 0.0
    ad = alt_diff(m, cities) if "alt" in feats else 0.0
    tv = travel_d if "travel" in feats else 0.0
    host_h = cr.home_adv * host_frac if ("host" in feats and m.home == host) else 0.0
    host_a = cr.home_adv * host_frac if ("host" in feats and m.away == host) else 0.0
    eta_h = (cr.intercept + cr.attack[h] - cr.defence[a]
             + cr.beta_talent * td + cr.beta_alt * ad + beta_travel * tv + host_h)
    eta_a = (cr.intercept + cr.attack[a] - cr.defence[h]
             - cr.beta_talent * td - cr.beta_alt * ad - beta_travel * tv + host_a)
    r = ScorelineModel(math.exp(eta_h), math.exp(eta_a)).match_result()
    return np.array([r["home"], r["draw"], r["away"]])


def gate_year(matches, cities, year, feats, prior_years, host_frac=1.0):
    """Score one held-out cup with the given feature subset. Returns the summed
    RPS for model / baseline(no features) / climatology and the fitted betas."""
    start, end, _ = TOURNAMENTS[year]
    train = [m for m in matches if m.d < start]
    eligible = fifa_member_teams(matches, since=date(year - 8, 1, 1))
    talent = talent_snapshot(year)

    use_talent = "talent" in feats
    use_alt = "alt" in feats
    cr = fit_combo(train, start, talent, cities,
                   use_talent=use_talent, use_alt=use_alt, eligible=eligible)
    base = fit_combo(train, start, {}, cities,
                     use_talent=False, use_alt=False, eligible=eligible)

    beta_travel = 0.0
    if "travel" in feats and prior_years:
        pool, pool_travel = [], {}
        for py in prior_years:
            ps, pe = WC_WINDOWS[py]
            tv = compute_travel(matches, py, cities)
            for m in matches:
                if ps <= m.d <= pe and m.tournament == "FIFA World Cup":
                    pool.append(m); pool_travel[id(m)] = tv[id(m)]
        beta_travel = fit_beta_travel(cr, pool, pool_travel, talent, cities, feats)

    test = [m for m in matches
            if start <= m.d <= end and m.tournament == "FIFA World Cup"]
    travel = compute_travel(matches, year, cities)
    clim = np.zeros(3)
    for m in test:
        clim[_outcome(m.hs, m.aws)] += 1
    clim = clim / clim.sum()

    rps_m = rps_b = rps_c = 0.0
    n = moved = 0
    host = HOST_TEAM[year]
    for m in test:
        out = _outcome(m.hs, m.aws)
        td_km = travel[id(m)][0] - travel[id(m)][1]
        pm = score_match(cr, m, talent, cities, beta_travel, td_km, host, feats, host_frac)
        pb = score_match(base, m, {}, cities, 0.0, 0.0, host, set())
        if pm is None or pb is None:
            continue
        rps_m += _rps(pm, out); rps_b += _rps(pb, out); rps_c += _rps(clim, out)
        n += 1
        moved += int(not np.allclose(pm, pb, atol=1e-6))
    return {"year": year, "n": n, "moved": moved, "beta_talent": cr.beta_talent,
            "beta_alt": cr.beta_alt, "beta_travel": beta_travel,
            "rps_m": rps_m, "rps_b": rps_b, "rps_c": rps_c}


# leave-one-WC-out prior sets for the travel two-stage (geocoded cups only).
TRAVEL_PRIOR = {2010: [], 2014: [2010], 2018: [2010, 2014], 2022: [2010, 2014, 2018]}


def run_feature(matches, cities, feats, label, host_frac=1.0):
    agg = {"m": 0.0, "b": 0.0, "c": 0.0, "n": 0, "moved": 0}
    betas = []
    for year in GATE_YEARS:
        r = gate_year(matches, cities, year, feats, TRAVEL_PRIOR[year], host_frac)
        agg["m"] += r["rps_m"]; agg["b"] += r["rps_b"]; agg["c"] += r["rps_c"]
        agg["n"] += r["n"]; agg["moved"] += r["moved"]
        betas.append(r)
    sb = 1 - agg["b"] / agg["c"]
    sm = 1 - agg["m"] / agg["c"]
    verdict = "KEEP" if sm > sb + 1e-9 else "DROP"
    print(f"\n{label}")
    print(f"  {'cup':<6}{'beta(t/alt/trav)':<26}{'moved':<8}"
          f"{'skill base':<12}{'skill feat':<12}{'delta':<10}")
    for r in betas:
        sb_y = 1 - r["rps_b"] / r["rps_c"]
        sm_y = 1 - r["rps_m"] / r["rps_c"]
        bstr = f"{r['beta_talent']:+.3f}/{r['beta_alt']:+.3f}/{r['beta_travel']:+.3f}"
        print(f"  {r['year']:<6}{bstr:<26}{r['moved']:>3}/{r['n']:<4}"
              f"{sb_y*100:>+8.1f}%   {sm_y*100:>+8.1f}%   {(sm_y-sb_y)*100:>+6.2f} pts")
    print(f"  {'COMBINED':<6}{'':<26}{agg['moved']:>3}/{agg['n']:<4}"
          f"{sb*100:>+8.1f}%   {sm*100:>+8.1f}%   {(sm-sb)*100:>+6.2f} pts  [{verdict}]")
    return sb, sm


def skill_of(matches, cities, feats, host_frac=1.0):
    """Combined four-cup model RPS skill for a feature subset (one number)."""
    m = c = 0.0
    for year in GATE_YEARS:
        r = gate_year(matches, cities, year, feats, TRAVEL_PRIOR[year], host_frac)
        m += r["rps_m"]; c += r["rps_c"]
    return 1 - m / c


def run_ablation(matches, cities):
    """Find the feature subset that maximises held-out RPS skill. The combined
    full stack is NOT assumed best — host/altitude can subtract (Robberechts)."""
    base = skill_of(matches, cities, set())
    print(f"\n  {'subset':<34}{'host_frac':<11}{'skill':<10}{'vs baseline'}")
    print(f"  {'baseline (strengths only)':<34}{'—':<11}{base*100:>+7.1f}%   —")
    combos = [
        ({"travel"}, 1.0),
        ({"talent"}, 1.0),
        ({"travel", "talent"}, 1.0),
        ({"travel", "talent", "host"}, 1.0),
        ({"travel", "talent", "host"}, 0.5),
        ({"travel", "talent", "host"}, 0.33),
        ({"travel", "talent", "alt"}, 1.0),
        ({"travel", "talent", "host", "alt"}, 1.0),
        ({"travel", "talent", "host", "alt"}, 0.5),
    ]
    best = (base, "baseline", "—")
    for feats, hf in combos:
        s = skill_of(matches, cities, feats, hf)
        label = "+".join(sorted(feats))
        hfs = f"{hf:g}" if "host" in feats else "—"
        flag = "  <-- best" if s > best[0] + 1e-9 else ""
        if s > best[0] + 1e-9:
            best = (s, label, hfs)
        print(f"  {label:<34}{hfs:<11}{s*100:>+7.1f}%   {(s-base)*100:>+6.2f} pts{flag}")
    print(f"\n  WINNER: {best[1]} (host_frac {best[2]})  "
          f"{best[0]*100:+.1f}%  ({(best[0]-base)*100:+.2f} pts vs baseline)")


def _main():
    matches = load_results()
    cities = load_city_map()
    print(f"loaded {len(matches):,} internationals; {len(cities):,} with venue city")
    print("Re-gate on the 2010/2014/2018/2022 hold-out. Baseline = strengths only.")
    print("beta columns: talent / altitude / travel (0.000 = feature abstains there).")

    print("\n" + "=" * 72)
    print("TASK 2 — each KEEP feature individually, on the four-cup hold-out")
    print("=" * 72)
    run_feature(matches, cities, {"host"}, "[host] fitted home_adv on the host nation's games")
    run_feature(matches, cities, {"talent"}, "[talent] FIFA squad-rating differential (abstains 2010/2014)")
    run_feature(matches, cities, {"alt"}, "[altitude] ascent-penalty differential (visible only on 2010)")
    run_feature(matches, cities, {"travel"}, "[travel] within-tournament flight-km differential")

    print("\n" + "=" * 72)
    print("TASK 3 — the COMBINED stack (the load-bearing gate)")
    print("=" * 72)
    run_feature(matches, cities, {"host", "talent", "alt", "travel"},
                "[host+talent+altitude+travel] all four together (host_frac 1.0)")
    print("\n  --- ablation: which subset actually maximises held-out RPS? ---")
    run_ablation(matches, cities)


if __name__ == "__main__":
    _main()
