"""Pull the martj42 international-results feed into Supabase.

This is the reliable, token-free spine of the data store. The martj42 dataset
(github.com/martj42/international_results) lists every international match ever
played — including friendlies and every 2026 World Cup fixture, with scores
filling in within ~a day of each match. From it we derive everything except
live odds:

  * football_matches  — the full feed (one upsert, idempotent on date+teams).
  * wc_standings       — group table, recomputed from played WC group games.
  * "last N matches per national team" is just a query on football_matches
    (see recent_form() below for the same logic in Python).

Run daily (a GitHub Action cron is the natural home):

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
        python3 -m polymarket_agent.ingest

Dry run (parse + print, no Supabase needed):

    python3 -m polymarket_agent.ingest --dry
"""

from __future__ import annotations

import csv
import sys
import urllib.request
from collections import defaultdict

from .calibrate import DATA_DIR, RESULTS_URL
from .sim import GROUPS

WC_TOURNAMENT = "FIFA World Cup"


def load_rows(refresh: bool = True) -> list[dict]:
    DATA_DIR.mkdir(exist_ok=True)
    path = DATA_DIR / "results.csv"
    if refresh or not path.exists():
        urllib.request.urlretrieve(RESULTS_URL, path)
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def _played(r: dict) -> bool:
    return (r["home_score"] not in ("", "NA")
            and r["away_score"] not in ("", "NA"))


def match_rows(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        p = _played(r)
        out.append({
            "match_date": r["date"],
            "home_team": r["home_team"],
            "away_team": r["away_team"],
            "home_score": int(r["home_score"]) if p else None,
            "away_score": int(r["away_score"]) if p else None,
            "tournament": r["tournament"],
            "city": (r.get("city") or "").strip() or None,
            "country": (r.get("country") or "").strip() or None,
            "neutral": r["neutral"].strip().upper() == "TRUE",
            "status": "played" if p else "scheduled",
        })
    return out


def standings(rows: list[dict]) -> list[dict]:
    """Group table from played WC *group-stage* matches (same group only)."""
    team_grp = {t: g for g, ts in GROUPS.items() for t in ts}
    tbl: dict[str, dict] = defaultdict(
        lambda: dict(played=0, won=0, drawn=0, lost=0, gf=0, ga=0, gd=0, points=0))
    for r in rows:
        if r["tournament"] != WC_TOURNAMENT or not _played(r):
            continue
        h, a = r["home_team"], r["away_team"]
        if h not in team_grp or a not in team_grp or team_grp[h] != team_grp[a]:
            continue  # only same-group fixtures count toward a group table
        hs, as_ = int(r["home_score"]), int(r["away_score"])
        for t, gf, ga in ((h, hs, as_), (a, as_, hs)):
            s = tbl[t]
            s["played"] += 1
            s["gf"] += gf
            s["ga"] += ga
            s["gd"] = s["gf"] - s["ga"]
            if gf > ga:
                s["won"] += 1
                s["points"] += 3
            elif gf == ga:
                s["drawn"] += 1
                s["points"] += 1
            else:
                s["lost"] += 1

    out: list[dict] = []
    for g, teams in GROUPS.items():
        ranked = sorted(
            teams,
            key=lambda t: (tbl[t]["points"], tbl[t]["gd"], tbl[t]["gf"]),
            reverse=True,
        )
        for i, t in enumerate(ranked, 1):
            s = tbl[t]
            out.append({
                "grp": g, "team": t, **s,
                "rank": i if s["played"] else None,
            })
    return out


def recent_form(rows: list[dict], n: int = 2,
                teams: set[str] | None = None) -> dict[str, list[dict]]:
    """Last `n` *played* matches per team — the Python mirror of the DB query."""
    played = sorted((r for r in rows if _played(r)), key=lambda r: r["date"])
    by_team: dict[str, list[dict]] = defaultdict(list)
    for r in played:
        for t in (r["home_team"], r["away_team"]):
            if teams is None or t in teams:
                by_team[t].append(r)
    return {t: v[-n:] for t, v in by_team.items()}


def main() -> None:
    dry = "--dry" in sys.argv
    rows = load_rows(refresh=True)
    matches = match_rows(rows)
    table = standings(rows)

    if dry:
        played = sum(1 for r in rows if _played(r))
        wc = sum(1 for r in rows if r["tournament"] == WC_TOURNAMENT)
        print(f"parsed {len(rows)} matches ({played} played, {wc} WC fixtures)")
        wc_teams = {t for ts in GROUPS.values() for t in ts}
        form = recent_form(rows, n=2, teams=wc_teams)
        for t in list(GROUPS["A"]) + list(GROUPS["I"]):
            last = form.get(t, [])
            tail = "  ".join(
                f"{m['date']} {m['home_team']} {m['home_score']}-"
                f"{m['away_score']} {m['away_team']}" for m in last) or "—"
            print(f"  last2 {t:<16} {tail}")
        print(f"standings rows: {len(table)} (all 0 until the WC kicks off)")
        return

    from . import store
    n = store.upsert("football_matches", matches,
                     on_conflict="match_date,home_team,away_team")
    store.upsert("wc_standings", table, on_conflict="grp,team")
    print(f"pushed {n} matches, {len(table)} standings rows to Supabase")


if __name__ == "__main__":
    main()
