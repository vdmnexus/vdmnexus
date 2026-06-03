"""Minimal Supabase PostgREST writer — stdlib only, no new deps.

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment (the same
service-role key apps/web and apps/nexus use). Writes go through PostgREST with
`Prefer: resolution=merge-duplicates`, so an upsert keyed on the table's
conflict target is idempotent — re-running an ingest never duplicates rows.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

_BATCH = 1000  # PostgREST handles a few thousand rows/request; stay well under.


def _cfg() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment")
    return url.rstrip("/"), key


def upsert(table: str, rows: list[dict], on_conflict: str | None = None) -> int:
    """Upsert rows into `table`, batched. Returns the number of rows sent."""
    if not rows:
        return 0
    base, key = _cfg()
    q = f"?on_conflict={on_conflict}" if on_conflict else ""
    sent = 0
    for i in range(0, len(rows), _BATCH):
        chunk = rows[i:i + _BATCH]
        req = urllib.request.Request(
            f"{base}/rest/v1/{table}{q}",
            data=json.dumps(chunk).encode(),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req) as r:
                r.read()
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:400]
            raise RuntimeError(f"supabase upsert {table}: {e.code} {body}")
        sent += len(chunk)
    return sent
