"""FastAPI surface — webhook endpoints the Vercel Cron pings.

Both /scan and /resolve require the shared WEBHOOK_SECRET via
either:
  - `Authorization: Bearer <secret>` (used by Vercel Cron when
    CRON_SECRET is configured on the relay), or
  - `X-Webhook-Secret: <secret>` (used by manual triggers / tests).

Long-running cycles run in a background task so the HTTP response
returns immediately. Logs are the source of truth — the Supabase
table is the durable record.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import asdict
from datetime import datetime, timezone

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse

from .config import Settings, load_settings
from .polymarket import check_geoblock
from .resolver import run_resolve_cycle
from .scanner import run_scan_cycle

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("polymarket_agent")

app = FastAPI(title="VDM Nexus Polymarket Agent", version="0.1.0")
_settings: Settings | None = None


def _get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = load_settings()
    return _settings


def _authorise(authorization: str | None, x_webhook_secret: str | None) -> None:
    settings = _get_settings()
    expected = settings.webhook_secret
    provided: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        provided = authorization.split(" ", 1)[1].strip()
    if provided is None:
        provided = x_webhook_secret
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "service": "polymarket-agent",
        "version": "0.1.0",
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/geoblock")
async def geoblock() -> dict:
    """Returns the Polymarket geoblock verdict for the bot's egress IP.
    Useful for verifying Railway deploy region before going live."""
    status = await check_geoblock()
    return {
        "ok": not status.blocked,
        "blocked": status.blocked,
        "country": status.country,
        "region": status.region,
    }


@app.on_event("startup")
async def _startup_geoblock_preflight() -> None:
    """Fail loudly at boot if Polymarket would reject our orders."""
    try:
        status = await check_geoblock()
    except Exception as e:
        log.warning("geoblock pre-flight failed: %s — continuing", e)
        return
    if status.blocked:
        log.error(
            "GEOBLOCK: country=%s region=%s — Polymarket will reject orders. "
            "Move the deploy to eu-west-1 (Ireland) or another non-restricted region.",
            status.country,
            status.region,
        )
    else:
        log.info("geoblock pre-flight ok: country=%s region=%s", status.country, status.region)


@app.post("/scan")
async def scan(
    background: BackgroundTasks,
    authorization: str | None = Header(default=None),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> JSONResponse:
    _authorise(authorization, x_webhook_secret)
    settings = _get_settings()
    background.add_task(_run_scan_background, settings)
    return JSONResponse({"ok": True, "queued": "scan"})


@app.post("/resolve")
async def resolve(
    background: BackgroundTasks,
    authorization: str | None = Header(default=None),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> JSONResponse:
    _authorise(authorization, x_webhook_secret)
    settings = _get_settings()
    background.add_task(_run_resolve_background, settings)
    return JSONResponse({"ok": True, "queued": "resolve"})


@app.post("/scan/sync")
async def scan_sync(
    authorization: str | None = Header(default=None),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> dict:
    """Synchronous variant — runs to completion before returning.
    Useful for `curl`-driven smoke tests and CI."""
    _authorise(authorization, x_webhook_secret)
    settings = _get_settings()
    report = await run_scan_cycle(settings)
    return {"ok": True, "report": asdict(report)}


@app.post("/resolve/sync")
async def resolve_sync(
    authorization: str | None = Header(default=None),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> dict:
    _authorise(authorization, x_webhook_secret)
    settings = _get_settings()
    report = await run_resolve_cycle(settings)
    return {"ok": True, "report": asdict(report)}


async def _run_scan_background(settings: Settings) -> None:
    try:
        report = await run_scan_cycle(settings)
        log.info("scan complete: %s", asdict(report))
    except Exception:
        log.exception("scan failed")


async def _run_resolve_background(settings: Settings) -> None:
    try:
        report = await run_resolve_cycle(settings)
        log.info("resolve complete: %s", asdict(report))
    except Exception:
        log.exception("resolve failed")


def _run_uvicorn() -> None:
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    asyncio.run(asyncio.sleep(0))  # ensure event loop is happy on Python 3.11
    _run_uvicorn()
