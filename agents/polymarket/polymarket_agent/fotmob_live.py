"""Live Fotmob poller — score + implied odds + xG during match days.

Fotmob locks its /api/ endpoints behind a signed `x-mas` request header, so a
plain HTTP GET returns the HTML shell, not JSON (verified 2026-06-03). The
robust way past that is to let a real browser make the request — the Fotmob web
app generates a valid token itself — and intercept the JSON response. That is
what this module does with Playwright: navigate to the page, read the JSON the
browser already fetched. No token reverse-engineering, so it survives Fotmob's
periodic signing changes.

This is the ONLY part of the data store that needs a browser. Everything else
(results, standings, last-N matches) comes from the token-free martj42 feed in
`ingest.py`. Keep the dependency isolated here.

Setup (once):

    pip install playwright
    playwright install chromium

Run during match days (polls every PERIOD seconds, writes snapshots):

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
        python3 -m polymarket_agent.fotmob_live --watch

One-shot capture of today's WC matches (no DB, prints what it sees):

    python3 -m polymarket_agent.fotmob_live --once --dry

NOTE: the exact JSON paths for odds/xG inside matchDetails shift between Fotmob
releases and cannot be validated until the tournament is live (group stage
starts 2026-06-11). Every snapshot therefore stores the full `raw` payload in
addition to the best-effort parsed fields, so nothing is lost and the
extractors below can be tightened against real data without re-scraping.
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import date, datetime, timezone

WC_LEAGUE_ID = 77            # Fotmob's World Cup league id
PERIOD_SECONDS = 120         # poll cadence while matches are live
FIXTURES_URL = f"https://www.fotmob.com/leagues/{WC_LEAGUE_ID}/matches"
MATCH_URL = "https://www.fotmob.com/match/{match_id}"


# --- best-effort extraction (refine against live data; raw is always stored) ---

def _find(obj, *keys):
    """Depth-first search for the first value under any of `keys`."""
    stack = [obj]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            for k, v in cur.items():
                if k in keys and v is not None:
                    return v
                stack.append(v)
        elif isinstance(cur, list):
            stack.extend(cur)
    return None


def parse_match(detail: dict) -> dict:
    """Pull score / status / implied-odds / xG out of a matchDetails payload."""
    header = detail.get("header", {}) if isinstance(detail, dict) else {}
    status = _find(header, "status") or {}
    score = status.get("scoreStr") or _find(detail, "scoreStr")
    hs = as_ = None
    if isinstance(score, str) and "-" in score:
        try:
            hs, as_ = (int(x) for x in score.split("-", 1))
        except ValueError:
            hs = as_ = None

    # implied win probabilities — Fotmob exposes either decimal odds or a
    # pre-computed prediction block depending on the release. Try both.
    probs = _find(detail, "matchPrediction", "prediction", "winProbability") or {}
    prob_home = _find(probs, "homeWin", "home", "h")
    prob_draw = _find(probs, "draw", "x")
    prob_away = _find(probs, "awayWin", "away", "a")

    xg = _find(detail, "expectedGoals", "xG") or {}

    teams = _find(header, "teams") or []
    home = teams[0].get("name") if len(teams) > 0 else None
    away = teams[1].get("name") if len(teams) > 1 else None

    return {
        "home_team": home,
        "away_team": away,
        "home_score": hs,
        "away_score": as_,
        "status": (status.get("reason", {}) or {}).get("short")
        or status.get("liveTime", {}).get("short"),
        "minute": (status.get("liveTime", {}) or {}).get("long"),
        "prob_home": _num(prob_home),
        "prob_draw": _num(prob_draw),
        "prob_away": _num(prob_away),
        "xg_home": _num(xg.get("home") if isinstance(xg, dict) else None),
        "xg_away": _num(xg.get("away") if isinstance(xg, dict) else None),
    }


def _num(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


# --- browser-mediated fetch ------------------------------------------------

def _capture_json(page, url: str, match_substr: str, timeout_ms: int = 15000):
    """Navigate to `url`, return the first intercepted JSON response whose URL
    contains `match_substr` (e.g. '/api/matchDetails')."""
    bucket: dict = {}

    def on_response(resp):
        if match_substr in resp.url and "json" in (
                resp.headers.get("content-type", "")):
            try:
                bucket.setdefault("data", resp.json())
            except Exception:
                pass

    page.on("response", on_response)
    page.goto(url, wait_until="networkidle", timeout=timeout_ms)
    # give late XHRs a beat to land
    for _ in range(10):
        if "data" in bucket:
            break
        page.wait_for_timeout(500)
    page.remove_listener("response", on_response)
    return bucket.get("data")


def todays_wc_match_ids(page, day: str) -> list[str]:
    """Match ids for `day` (YYYYMMDD) in the WC league, via the fixtures page."""
    data = _capture_json(page, f"{FIXTURES_URL}?date={day}", "/api/")
    ids: list[str] = []
    for m in (_find(data, "matches") or []):
        mid = m.get("id") if isinstance(m, dict) else None
        if mid is not None:
            ids.append(str(mid))
    return ids


def snapshot(page, match_id: str) -> dict | None:
    detail = _capture_json(
        page, MATCH_URL.format(match_id=match_id), "/api/matchDetails")
    if not detail:
        return None
    row = parse_match(detail)
    row["match_id"] = match_id
    row["captured_at"] = datetime.now(timezone.utc).isoformat()
    row["raw"] = detail
    return row


def run(once: bool, dry: bool) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit(
            "playwright not installed — run: pip install playwright && "
            "playwright install chromium")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            while True:
                day = date.today().strftime("%Y%m%d")
                try:
                    ids = todays_wc_match_ids(page, day)
                except Exception as e:  # fail soft: a Fotmob hiccup is non-fatal
                    print(f"[fotmob] fixtures fetch failed: {e}")
                    ids = []
                rows = []
                for mid in ids:
                    try:
                        s = snapshot(page, mid)
                    except Exception as e:
                        print(f"[fotmob] match {mid} failed: {e}")
                        s = None
                    if s:
                        rows.append(s)

                if dry:
                    for r in rows:
                        print(json.dumps({k: v for k, v in r.items()
                                          if k != "raw"}, ensure_ascii=False))
                    print(f"[fotmob] {len(rows)} snapshot(s) for {day}")
                elif rows:
                    from . import store
                    store.upsert("fotmob_match_snapshots", rows)
                    print(f"[fotmob] wrote {len(rows)} snapshot(s) for {day}")

                if once:
                    break
                time.sleep(PERIOD_SECONDS)
        finally:
            browser.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--watch", action="store_true",
                    help="poll continuously every PERIOD_SECONDS")
    ap.add_argument("--once", action="store_true", help="single pass then exit")
    ap.add_argument("--dry", action="store_true",
                    help="print snapshots, do not write to Supabase")
    args = ap.parse_args()
    run(once=not args.watch, dry=args.dry)


if __name__ == "__main__":
    main()
