"""Build refdata/squads_<year>.csv from the Wikipedia "<year> FIFA World Cup squads" page.

Roster source for the roster-talent experiment (build #1 in PIPELINE.md). The
same wikitable/template layout exists for 2018, 2022 and 2026, so one parser
yields point-in-time rosters for the gate backtest AND the live 2026 squad in
an identical schema — which is exactly what roster-talent needs.

Each player is a single `{{nat fs g player|...}}` line under a `===Team===`
heading, preceded by a `Coach:`/`Head coach:` line. We read line-by-line and
pull the fields we want with targeted regexes (the templates nest other
templates like {{birth date and age2|...}}, so brace-balancing is avoided by
working one line at a time).

Run:    python -m polymarket_agent.build_squads 2026
Writes: refdata/squads_<year>.csv
        columns: team,coach,no,pos,name,caps,goals,club,clubnat
"""

from __future__ import annotations

import csv
import re
import sys
import urllib.request
from pathlib import Path

REFDATA = Path(__file__).resolve().parent.parent / "refdata"
UA = "vdmnexus-research/1.0 (dennis@vdmnexus.com)"

_HEADING = re.compile(r"^===\s*([^=].*?)\s*===\s*$")
_COACH = re.compile(r"^(?:Head coach|Coach|Manager)\s*:\s*(.+)$")
_PLAYER = re.compile(r"^\{\{nat fs (?:g )?player\|")
# a value is either a [[wiki link]] (which may contain its own pipe) or a run
# of non-pipe, non-brace characters.
_LINKVAL = r"(\[\[[^\]]*\]\]|[^|}]+)"


def fetch_wikitext(year: int) -> str:
    title = f"{year}_FIFA_World_Cup_squads"
    url = f"https://en.wikipedia.org/w/index.php?title={title}&action=raw"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def _strip_link(s: str) -> str:
    """[[A|B]] -> B ; [[A]] -> A ; plain -> plain."""
    s = s.strip()
    m = re.match(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", s)
    return (m.group(1) if m else s).strip()


def _f(body: str, key: str, link: bool = False) -> str:
    pat = rf"\|{key}=" + (_LINKVAL if link else r"([^|}]*)")
    m = re.search(pat, body)
    if not m:
        return ""
    return _strip_link(m.group(1)) if link else m.group(1).strip()


def parse_squads(wikitext: str) -> list[dict]:
    rows: list[dict] = []
    team = coach = ""
    for line in wikitext.splitlines():
        h = _HEADING.match(line)
        if h:
            team, coach = h.group(1).strip(), ""
            continue
        c = _COACH.match(line.strip())
        if c and team:
            # strip HTML comments/refs, then {{flagicon|XXX}} templates, then link.
            raw = re.sub(r"<!--.*?-->|<ref.*?(?:/>|</ref>)", "", c.group(1))
            coach = _strip_link(re.sub(r"\{\{[^}]*\}\}", "", raw))
            continue
        if _PLAYER.match(line.strip()):
            rows.append({
                "team": team,
                "coach": coach,
                "no": _f(line, "no"),
                "pos": _f(line, "pos"),
                "name": _f(line, "name", link=True),
                "caps": _f(line, "caps"),
                "goals": _f(line, "goals"),
                "club": _f(line, "club", link=True),
                "clubnat": _f(line, "clubnat"),
            })
    return rows


def build(year: int) -> Path:
    rows = parse_squads(fetch_wikitext(year))
    if not rows:
        raise SystemExit(f"no players parsed for {year} — page layout may differ")
    REFDATA.mkdir(parents=True, exist_ok=True)
    out = REFDATA / f"squads_{year}.csv"
    cols = ["team", "coach", "no", "pos", "name", "caps", "goals", "club", "clubnat"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    teams = sorted({r["team"] for r in rows})
    print(f"wrote {len(rows)} players across {len(teams)} teams -> {out}")
    return out


if __name__ == "__main__":
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    build(year)
