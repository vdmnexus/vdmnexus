"""Export per-team Fotmob xG / style profiles as canonical JSON for the web UI.

THIS IS A DISPLAY / SCOUTING FEED — IT IS NOT A MODEL INPUT.

It is the descriptive cousin of `export_scores.py`. Where the score sheet is the
gated Dixon-Coles prediction, this file is an *ungated* intelligence layer: each
2026 team's recent expected-goals form and dead-ball / counter-attack tendencies,
sourced from Fotmob. None of it is read by `sim.py`; it never touches EV, odds, or
the Monte-Carlo. It exists so both the marketing /wc26 route and wc.vdmnexus.com
can render a team profile alongside the model's pick.

Why ungated (see PIPELINE.md): Fotmob xG and the shot `situation` tags ride on the
shotmap, which exists 2022-onward but NOT for the 2018 World Cup. The gate scores
held-out RPS on BOTH 2018 and 2022, so an xG-based rating cannot be backtested on
the 2018 fold and therefore cannot enter the model. It is point-in-time valid and
genuine (match xG is immutable) — it just isn't gateable. So: display only.

Data flow (all token-free, CI-safe):

    Fotmob league-season match lists  ─→  per-match xG + goal situations
                                            │  (cached by immutable matchId)
                                            ▼
    refdata/fotmob_xg_cache.json  ─→  hybrid coach-window + recency decay
                                            ▼
                              exports/team_profiles.json

The matchId cache is the key to pipelineability: match xG never changes, so once a
match is cached it is never re-fetched. A daily CI run only fetches matches that
have appeared since the last run — cheap and token-free. The Fotmob buildId
(which rotates per deploy) is discovered at runtime.

Run:  python3 -m polymarket_agent.export_profiles
"""

from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
ROOT = Path(__file__).resolve().parents[1]            # agents/polymarket
CACHE_PATH = ROOT / "refdata" / "fotmob_xg_cache.json"
COACHES_PATH = ROOT / "refdata" / "coaches_2026.csv"
OUT_PATH = ROOT / "exports" / "team_profiles.json"
TEAMS_DIR = ROOT.parents[1] / "apps" / "wc" / "content" / "teams"

# --------------------------------------------------------------------------- #
# Tunables
# --------------------------------------------------------------------------- #
HALF_LIFE_DAYS = 365.0      # recency decay on xG form
MIN_COACH_MATCHES = 8       # below this, fall back to a fixed recent window
FALLBACK_WINDOW_DAYS = 730  # the fixed window used when a coach is too new
MAX_MATCHES_PER_TEAM = 40   # cap (decay makes older ones negligible anyway)
REQUEST_PAUSE = 0.08        # be polite to Fotmob

# Set-piece and counter situations (Fotmob shot.situation enum)
SITU_SETPIECE = {"FromCorner", "SetPiece", "ThrowInSetPiece",
                 "DirectFreekick", "FreeKick"}
SITU_COUNTER = {"FastBreak"}
SITU_PENALTY = {"Penalty"}

# --------------------------------------------------------------------------- #
# xG-bearing international competitions (Fotmob leagueId -> seasons).
# Confirmed ids: WC=77, Euro=50, Copa=44, CONMEBOL WCQ=10199.
# Others are filled from the leagueId research; UNKNOWN entries are skipped
# with a warning so the run still succeeds on partial coverage.
# --------------------------------------------------------------------------- #
COMPETITIONS: list[dict] = [
    # Major tournaments
    {"id": 77,  "slug": "world-cup",    "seasons": ["2022"]},
    {"id": 50,  "slug": "euro",         "seasons": ["2024"]},
    {"id": 44,  "slug": "copa-america", "seasons": ["2024"]},
    {"id": 289, "slug": "afcon",        "seasons": ["2023", "2025"]},
    {"id": 290, "slug": "asian-cup",    "seasons": ["2023"]},
    {"id": 298, "slug": "gold-cup",     "seasons": ["2023", "2025"]},
    # Nations Leagues (UEFA tiers A-D + CONCACAF)
    {"id": 9806, "slug": "nations-league",
     "seasons": ["2022/2023", "2024/2025", "2026/2027"]},
    {"id": 9807, "slug": "nations-league",
     "seasons": ["2022/2023", "2024/2025"]},
    {"id": 9808, "slug": "nations-league",
     "seasons": ["2022/2023", "2024/2025"]},
    {"id": 9809, "slug": "nations-league",
     "seasons": ["2022/2023", "2024/2025"]},
    {"id": 9821, "slug": "concacaf-nations-league",
     "seasons": ["2023/2024", "2024/2025"]},
    # World Cup 2026 qualification, per confederation
    {"id": 10195, "slug": "world-cup-qualification-uefa",
     "seasons": ["2025/2026", "2024/2025"]},
    {"id": 10196, "slug": "world-cup-qualification-caf",
     "seasons": ["2023/2025", "2023", "2024", "2025"]},
    {"id": 10197, "slug": "world-cup-qualification-afc",
     "seasons": ["2023/2025", "2023", "2024", "2025"]},
    {"id": 10198, "slug": "world-cup-qualification-concacaf",
     "seasons": ["2024/2025", "2025"]},
    {"id": 10199, "slug": "world-cup-qualification-conmebol",
     "seasons": ["2023/2024", "2024", "2025", "2026"]},
    {"id": 10200, "slug": "world-cup-qualification-ofc",
     "seasons": ["2024/2025"]},
]

_UA = {"User-Agent": "Mozilla/5.0 (compatible; vdmnexus-wc/1.0)"}
_SSL = ssl.create_default_context()
_SSL.check_hostname = False
_SSL.verify_mode = ssl.CERT_NONE


# --------------------------------------------------------------------------- #
# Low-level fetch
# --------------------------------------------------------------------------- #
def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=_UA)
    with urllib.request.urlopen(req, timeout=40, context=_SSL) as r:
        return r.read()


def _get_json(url: str) -> dict:
    return json.loads(_get(url))


def discover_build_id() -> str:
    """Fotmob's _next/data routes are keyed by a buildId that rotates on every
    deploy. Discover the current one from the homepage __NEXT_DATA__ blob."""
    html = _get("https://www.fotmob.com/en").decode("utf-8", "replace")
    m = re.search(r'"buildId":"([^"]+)"', html)
    if not m:
        m = re.search(r'/_next/static/([^/]+)/_buildManifest', html)
    if not m:
        raise RuntimeError("could not discover Fotmob buildId")
    return m.group(1)


def _num(x) -> float | None:
    m = re.search(r"-?\d+\.?\d*", str(x))
    return float(m.group()) if m else None


# --------------------------------------------------------------------------- #
# Competition season -> list of (slug, code, matchId, iso_date)
# --------------------------------------------------------------------------- #
def season_matches(build: str, comp: dict, season: str) -> list[tuple]:
    url = (f"https://www.fotmob.com/_next/data/{build}/en/leagues/{comp['id']}"
           f"/matches/{comp['slug']}.json?season={season}"
           f"&lng=en&id={comp['id']}&slug={comp['slug']}")
    try:
        blob = json.dumps(_get_json(url))
    except Exception as e:  # noqa: BLE001
        print(f"  ! season list failed {comp['id']}/{season}: {e}")
        return []
    out, seen = [], set()
    for mm in re.finditer(r"/matches/([a-z0-9-]+)/([a-z0-9]+)#(\d+)", blob):
        slug, code, mid = mm.groups()
        if mid in seen:
            continue
        seen.add(mid)
        out.append((slug, code, mid))
    return out


# --------------------------------------------------------------------------- #
# Per-match xG + goal situations (cached by immutable matchId)
# --------------------------------------------------------------------------- #
def fetch_match(build: str, slug: str, code: str, mid: str) -> dict | None:
    url = (f"https://www.fotmob.com/_next/data/{build}/en/matches/{slug}/{code}"
           f".json?lng=en&id={mid}&slug={slug}")
    try:
        pp = _get_json(url)["pageProps"]
    except Exception:  # noqa: BLE001
        return None
    g = pp.get("general", {})
    # Collision guard: the slug route resolves to the *latest* meeting of a
    # pairing; if the returned matchId differs, this is the wrong match.
    if g.get("matchId") and int(g["matchId"]) != int(mid):
        return None
    ht, at = g.get("homeTeam", {}), g.get("awayTeam", {})
    if not ht.get("id") or not at.get("id"):
        return None

    # xG stat block
    xg_box = [None]

    def _walk_xg(o):
        if isinstance(o, dict):
            if (o.get("title") in ("Expected goals (xG)", "Expected goals")
                    and isinstance(o.get("stats"), list)):
                xg_box[0] = o["stats"]
            for v in o.values():
                _walk_xg(v)
        elif isinstance(o, list):
            for v in o:
                _walk_xg(v)
    _walk_xg(pp)
    xg_h = xg_a = None
    if xg_box[0] and len(xg_box[0]) == 2:
        xg_h, xg_a = _num(xg_box[0][0]), _num(xg_box[0][1])

    # goals by situation, per team id
    sm = pp.get("content", {}).get("shotmap") or {}
    shots = sm.get("shots") if isinstance(sm, dict) else sm
    situ: dict[str, dict] = {}
    for s in (shots or []):
        if (s.get("eventType") != "Goal" or s.get("period") == "PenaltyShootout"
                or s.get("isOwnGoal")):
            continue
        tid = str(s.get("teamId"))
        rec = situ.setdefault(tid, {"sp": 0, "fb": 0, "pk": 0, "tot": 0})
        rec["tot"] += 1
        st = s.get("situation")
        if st in SITU_SETPIECE:
            rec["sp"] += 1
        elif st in SITU_COUNTER:
            rec["fb"] += 1
        elif st in SITU_PENALTY:
            rec["pk"] += 1

    # date: prefer the ISO field; fall back to parsing the human string
    iso = g.get("matchTimeUTCDate") or ""
    if not iso:
        # "Sun, Dec 18, 2022, 15:00 UTC"
        try:
            iso = datetime.strptime(
                g.get("matchTimeUTC", ""), "%a, %b %d, %Y, %H:%M UTC"
            ).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            iso = ""
    return {
        "mid": int(mid),
        "date": iso,
        "homeId": ht["id"], "awayId": at["id"],
        "home": ht.get("name"), "away": at.get("name"),
        "xgH": xg_h, "xgA": xg_a,
        "situ": situ,
        "league": g.get("leagueName"),
    }


# --------------------------------------------------------------------------- #
# Team-name -> repo slug
# --------------------------------------------------------------------------- #
_ALIAS = {
    "united states": "united-states", "usa": "united-states",
    "south korea": "south-korea", "korea republic": "south-korea",
    "turkiye": "turkey", "türkiye": "turkey",
    "czechia": "czech-republic",
    "ivory coast": "ivory-coast", "côte d'ivoire": "ivory-coast",
    "cote d'ivoire": "ivory-coast",
    "dr congo": "dr-congo", "congo dr": "dr-congo",
    "cape verde": "cape-verde", "cabo verde": "cape-verde",
    "curacao": "curacao", "curaçao": "curacao",
    "bosnia & herzegovina": "bosnia-and-herzegovina",
    "bosnia and herzegovina": "bosnia-and-herzegovina",
    "south africa": "south-africa", "new zealand": "new-zealand",
}


def _slugify(name: str) -> str:
    if not name:
        return ""
    key = name.strip().lower()
    if key in _ALIAS:
        return _ALIAS[key]
    return key.replace(" ", "-").replace("'", "")


def load_team_slugs() -> set[str]:
    return {p.stem for p in TEAMS_DIR.glob("*.json") if p.stem != "_template"}


def load_coaches() -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not COACHES_PATH.exists():
        return out
    lines = COACHES_PATH.read_text(encoding="utf-8").splitlines()
    for ln in lines[1:]:
        if not ln.strip():
            continue
        # naive CSV (coach/source may be quoted but we only need slug+appointed)
        parts = next(__import__("csv").reader([ln]))
        if len(parts) < 3:
            continue
        slug, coach, appointed = parts[0], parts[1], parts[2]
        out[slug.strip()] = {"coach": coach.strip(),
                             "appointed": appointed.strip()}
    return out


# --------------------------------------------------------------------------- #
# Cache
# --------------------------------------------------------------------------- #
def load_cache() -> dict:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False) + "\n",
                          encoding="utf-8")


def refresh_cache(build: str, cache: dict) -> dict:
    """Fetch any not-yet-cached matches across all competitions."""
    n_new = 0
    for comp in COMPETITIONS:
        if comp["id"] == "UNKNOWN":
            continue
        for season in comp["seasons"]:
            mids = season_matches(build, comp, season)
            todo = [(s, c, m) for (s, c, m) in mids if m not in cache]
            if mids:
                print(f"  {comp['slug']}/{season}: {len(mids)} matches, "
                      f"{len(todo)} new")
            for slug, code, mid in todo:
                rec = fetch_match(build, slug, code, mid)
                # Cache even a None-xG result (as a tombstone) so we don't
                # re-fetch friendlies/competitions Fotmob never scored.
                cache[mid] = rec or {"mid": int(mid), "xgH": None}
                n_new += 1
                if n_new % 25 == 0:
                    save_cache(cache)
                    print(f"    …cached {n_new} new matches")
                time.sleep(REQUEST_PAUSE)
    save_cache(cache)
    print(f"  cache now holds {len(cache)} matches (+{n_new} this run)")
    return cache


# --------------------------------------------------------------------------- #
# Aggregation
# --------------------------------------------------------------------------- #
def _parse_iso(s: str):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def build_profiles(cache: dict, slugs: set[str], coaches: dict,
                   ref: date) -> dict:
    ref_dt = datetime(ref.year, ref.month, ref.day, tzinfo=timezone.utc)

    # index cached matches per team slug (only those with xG)
    per_team: dict[str, list[dict]] = {s: [] for s in slugs}
    for rec in cache.values():
        if not rec or rec.get("xgH") is None:
            continue
        dt = _parse_iso(rec.get("date", ""))
        if not dt:
            continue
        for side, opp in (("H", "A"), ("A", "H")):
            name = rec["home"] if side == "H" else rec["away"]
            slug = _slugify(name or "")
            if slug not in per_team:
                continue
            xgf = rec["xgH"] if side == "H" else rec["xgA"]
            xga = rec["xgA"] if side == "H" else rec["xgH"]
            tid = str(rec["homeId"] if side == "H" else rec["awayId"])
            situ = rec.get("situ", {}).get(tid, {})
            per_team[slug].append({
                "dt": dt, "xgf": xgf, "xga": xga, "situ": situ,
                "league": rec.get("league"),
            })

    profiles = {}
    for slug in sorted(slugs):
        ms = sorted(per_team[slug], key=lambda m: m["dt"], reverse=True)
        coach = coaches.get(slug, {})
        appt = _parse_iso((coach.get("appointed") or "") + "T00:00:00+00:00")

        if appt:
            window = [m for m in ms if m["dt"] >= appt and m["dt"] <= ref_dt]
        else:
            window = []
        mode = "coach"
        if len(window) < MIN_COACH_MATCHES:
            cut = ref_dt.timestamp() - FALLBACK_WINDOW_DAYS * 86400
            window = [m for m in ms
                      if m["dt"].timestamp() >= cut and m["dt"] <= ref_dt]
            mode = "recent" if appt else "recent-nocoach"
        window = window[:MAX_MATCHES_PER_TEAM]

        if not window:
            profiles[slug] = {"coach": coach.get("coach"),
                              "coach_since": coach.get("appointed"),
                              "window": mode, "matches": 0,
                              "confidence": "none"}
            continue

        W = swf = swa = 0.0
        gsp = gfb = gpk = gtot = 0
        for m in window:
            wt = 0.5 ** ((ref_dt - m["dt"]).days / HALF_LIFE_DAYS)
            W += wt
            swf += wt * (m["xgf"] or 0.0)
            swa += wt * (m["xga"] or 0.0)
            s = m["situ"]
            gsp += s.get("sp", 0); gfb += s.get("fb", 0)
            gpk += s.get("pk", 0); gtot += s.get("tot", 0)

        n = len(window)
        conf = "high" if n >= 12 else "medium" if n >= 6 else "low"
        profiles[slug] = {
            "coach": coach.get("coach"),
            "coach_since": coach.get("appointed"),
            "window": mode,
            "matches": n,
            "confidence": conf,
            "xgf": round(swf / W, 2),
            "xga": round(swa / W, 2),
            "xgd": round((swf - swa) / W, 2),
            "goals": gtot,
            "setpiece_pct": round(gsp / gtot * 100) if gtot else None,
            "counter_pct": round(gfb / gtot * 100) if gtot else None,
            "penalty_pct": round(gpk / gtot * 100) if gtot else None,
        }
    return profiles


def build() -> dict:
    slugs = load_team_slugs()
    coaches = load_coaches()
    print(f"teams: {len(slugs)} | coaches loaded: {len(coaches)}")
    build_id = discover_build_id()
    print(f"fotmob buildId: {build_id}")
    cache = load_cache()
    cache = refresh_cache(build_id, cache)
    today = date.today()
    profiles = build_profiles(cache, slugs, coaches, today)
    n_ok = sum(1 for p in profiles.values() if p.get("matches"))
    return {
        "generated_at": today.isoformat(),
        "source": "fotmob",
        "note": ("Descriptive xG / style profile. DISPLAY ONLY — not a model "
                 "input; never read by sim.py. xG covers competitive matches "
                 "2022-onward; friendlies vs minor opposition carry no xG."),
        "method": (f"Fotmob match xG, current-coach window (fallback "
                   f"{FALLBACK_WINDOW_DAYS}d if <{MIN_COACH_MATCHES} matches), "
                   f"recency half-life {int(HALF_LIFE_DAYS)}d."),
        "teams_with_data": n_ok,
        "profiles": profiles,
    }


def _main() -> None:
    data = build()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    print(f"wrote {data['teams_with_data']} team profiles -> {OUT_PATH}")


if __name__ == "__main__":
    _main()
