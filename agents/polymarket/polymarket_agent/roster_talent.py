"""Roster-restricted squad talent — build #1 in PIPELINE.md.

`exp_talent.compute_talent` pools EVERY FC-rated player of a nationality and
means the top-K. This module instead means the ratings of the ACTUAL announced
26-man squad (refdata/squads_<year>.csv), which is the talent number a results
rating structurally can't see, sharpened to the players actually going.

The hard part is the name-join: Wikipedia roster names ("Lionel Messi") vs FC
names (short "L. Messi", long "Lionel Andrés Messi Cuccittini"). We match
WITHIN a nationality (huge ambiguity reduction) using accent-folded token
matching, and report coverage so the gate isn't fed a sparse signal.

Diagnostic:  python -m polymarket_agent.roster_talent      # coverage per year
"""

from __future__ import annotations

import csv
import re
import sys
import unicodedata
from pathlib import Path

from .exp_talent import FIFA_FILE, FIFA_TO_TEAM, MIN_SQUAD

REFDATA = Path(__file__).resolve().parent.parent / "refdata"
DATA = Path(__file__).resolve().parent.parent / ".data"
# FC files carry player NAMES only in the full .data/ dump, not the 2-col trim.
FC_NAME = {18: "Name", 22: "long_name", 26: "long_name"}
FC_SHORT = {18: "Name", 22: "short_name", 26: "short_name"}


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def _fc_year(year: int) -> int:
    return year % 100


def load_fc_by_team(year: int) -> dict[str, list[dict]]:
    """team name -> [{ovr, long, short, ltok}] for every rated player."""
    fy = _fc_year(year)
    fname, nat_field, ovr_field = FIFA_FILE[year]
    path = DATA / fname
    name_f, short_f = FC_NAME[fy], FC_SHORT[fy]
    by_team: dict[str, list[dict]] = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            nat, ovr = row.get(nat_field), row.get(ovr_field)
            if not nat or not ovr:
                continue
            try:
                o = float(ovr)
            except ValueError:
                continue
            team = FIFA_TO_TEAM.get(nat, nat)
            long_n = _norm(row.get(name_f, ""))
            by_team.setdefault(team, []).append({
                "ovr": o, "long": long_n, "short": _norm(row.get(short_f, "")),
                "ltok": long_n.split(),
            })
    return by_team


def _match(rn: str, pool: list[dict]) -> dict | None:
    rtok = rn.split()
    if not rtok:
        return None
    rset = set(rtok)
    # 1. exact long or short
    for p in pool:
        if rn == p["long"] or rn == p["short"]:
            return p
    # 2. roster tokens are a subset of FC long-name tokens (missing middle names)
    for p in pool:
        if len(rtok) >= 2 and rset <= set(p["ltok"]):
            return p
    # 3. surname agrees + first name agrees or is a prefix (Sebas/Sebastián)
    for p in pool:
        if len(p["ltok"]) >= 2 and rtok[-1] == p["ltok"][-1]:
            a, b = rtok[0], p["ltok"][0]
            if a == b or (len(a) >= 3 and len(b) >= 3 and (a.startswith(b) or b.startswith(a))):
                return p
    # 4. initial + surname vs FC short ("l messi")
    cand = f"{rtok[0][0]} {rtok[-1]}"
    for p in pool:
        if p["short"] == cand:
            return p
    # 5. surname unique within the nationality pool
    last = rtok[-1]
    hits = [p for p in pool if p["ltok"] and p["ltok"][-1] == last]
    if len(hits) == 1:
        return hits[0]
    return None


def load_squads(year: int) -> dict[str, list[str]]:
    """team -> [player display names] from refdata/squads_<year>.csv."""
    squads: dict[str, list[str]] = {}
    with open(REFDATA / f"squads_{year}.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            squads.setdefault(row["team"], []).append(row["name"])
    return squads


def compute_roster_talent(year: int, topk: int, *, report=False):
    """team -> mean Overall of matched squad's top-`topk` players, /10."""
    fc = load_fc_by_team(year)
    squads = load_squads(year)
    # align team names: squads use Wikipedia spelling, fc uses FIFA_TO_TEAM target
    fc_norm = {_norm(t): t for t in fc}
    talent: dict[str, float] = {}
    cov: dict[str, tuple[int, int]] = {}  # team -> (matched, squad size)
    matched = total = 0
    for team, names in squads.items():
        pool = fc.get(team) or fc.get(fc_norm.get(_norm(team), ""), [])
        ovrs = []
        for nm in names:
            total += 1
            m = _match(_norm(nm), pool) if pool else None
            if m:
                matched += 1
                ovrs.append(m["ovr"])
        cov[team] = (len(ovrs), len(names))
        if len(ovrs) >= MIN_SQUAD:
            ovrs.sort(reverse=True)
            talent[team] = sum(ovrs[:topk]) / len(ovrs[:topk]) / 10.0
    if report:
        print(f"  {year}: matched {matched}/{total} "
              f"({100*matched/total:.1f}%) across {len(talent)} teams")
        gaps = sorted((c / n, t, c, n) for t, (c, n) in cov.items() if c / n < 0.6)
        print(f"    data-gap teams (<60%, get talent=0): "
              f"{', '.join(t for _, t, _, _ in gaps) or 'none'}")
    return talent


def coverage_for(year: int, teams: list[str], topk: int = 23):
    """print squad-match coverage for a specific set of teams (e.g. contenders)."""
    fc = load_fc_by_team(year)
    squads = load_squads(year)
    fc_norm = {_norm(t): t for t in fc}
    for team in teams:
        names = squads.get(team, [])
        pool = fc.get(team) or fc.get(fc_norm.get(_norm(team), ""), [])
        hit = sum(1 for nm in names if pool and _match(_norm(nm), pool))
        print(f"    {team:18s} {hit}/{len(names)}")


def _main():
    topk = int(sys.argv[1]) if len(sys.argv) > 1 else 23
    print(f"roster-talent name-join coverage (top-K={topk})")
    for year in (2018, 2022, 2026):
        compute_roster_talent(year, topk, report=True)


if __name__ == "__main__":
    _main()
