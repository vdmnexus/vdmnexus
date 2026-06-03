"""Polymarket Gamma + CLOB clients.

Three surfaces are used:
  - Gamma API (gamma-api.polymarket.com) — unauthenticated public
    market discovery + metadata. The scanner uses this to find
    candidates.
  - CLOB API (clob.polymarket.com) — authenticated order placement
    via py-clob-client-v2. Uses POLY_1271 (deposit-wallet flow,
    recommended for new API users): the EOA is the signer, a separate
    deposit wallet is the funder that actually holds USDC.
  - Geoblock check (polymarket.com/api/geoblock) — startup pre-flight
    so the bot fails fast if it ever lands in a blocked region.

Order placement is feature-gated behind dry_run. The default
deployment flips dry_run=true so we can prove the scan + reason +
record-to-Supabase loop without touching real funds. When the
founder is ready to flip live, set POLYMARKET_DRY_RUN=0.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from .config import Settings

log = logging.getLogger(__name__)


@dataclass
class Market:
    """A normalised Polymarket market for the reasoning layer."""

    id: str  # condition_id
    slug: str
    question: str
    description: str
    category: str | None
    end_date: datetime | None
    volume_usdc: float
    yes_price: float
    no_price: float
    tokens: list[dict[str, Any]]  # raw token objects for order placement
    raw: dict[str, Any]  # full Gamma payload for debugging


async def fetch_open_markets(
    settings: Settings, *, limit: int = 200, offset: int = 0
) -> list[Market]:
    """Fetch open Polymarket markets via Gamma. No auth required.

    Filters at the API level for active markets; further filtering
    (category, volume, time-to-close) happens in `markets.py`.
    """
    url = f"{settings.gamma_url}/markets"
    params = {
        "limit": str(limit),
        "offset": str(offset),
        "active": "true",
        "closed": "false",
        "archived": "false",
        "order": "volume",
        "ascending": "false",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        payload = r.json()

    raw_markets = payload if isinstance(payload, list) else payload.get("data", [])
    markets: list[Market] = []
    for m in raw_markets:
        try:
            markets.append(_parse_gamma_market(m))
        except Exception as e:
            log.debug("skipping unparseable market %s: %s", m.get("id"), e)
    return markets


def _parse_gamma_market(m: dict[str, Any]) -> Market:
    condition_id = m.get("conditionId") or m.get("condition_id") or m.get("id") or ""
    tokens = m.get("tokens") or m.get("clobTokenIds") or []
    # Outcome prices may be in `outcomePrices` (stringified list) or per-token.
    yes_price, no_price = _extract_yes_no_prices(m, tokens)
    end_date = _parse_iso(m.get("endDate") or m.get("end_date_iso"))
    return Market(
        id=str(condition_id),
        slug=m.get("slug") or "",
        question=m.get("question") or m.get("title") or "",
        description=m.get("description") or "",
        category=(m.get("category") or "").lower() or None,
        end_date=end_date,
        volume_usdc=float(m.get("volume") or m.get("volumeNum") or 0.0),
        yes_price=yes_price,
        no_price=no_price,
        tokens=tokens if isinstance(tokens, list) else [],
        raw=m,
    )


def _extract_yes_no_prices(
    m: dict[str, Any], tokens: list[Any]
) -> tuple[float, float]:
    """Pull YES / NO prices out of the Gamma response.

    Gamma is not perfectly consistent — older markets carry
    `outcomePrices` as a stringified JSON list, newer ones embed
    prices inside each token. Try both.
    """
    raw_prices = m.get("outcomePrices")
    if isinstance(raw_prices, str):
        try:
            import json

            raw_prices = json.loads(raw_prices)
        except Exception:
            raw_prices = None

    if isinstance(raw_prices, list) and len(raw_prices) >= 2:
        try:
            return float(raw_prices[0]), float(raw_prices[1])
        except (TypeError, ValueError):
            pass

    yes_price = 0.0
    no_price = 0.0
    if isinstance(tokens, list):
        for t in tokens:
            if not isinstance(t, dict):
                continue
            outcome = (t.get("outcome") or t.get("name") or "").upper()
            price = float(t.get("price") or 0.0)
            if outcome == "YES":
                yes_price = price
            elif outcome == "NO":
                no_price = price

    if yes_price == 0.0 and no_price > 0.0:
        yes_price = 1.0 - no_price
    if no_price == 0.0 and yes_price > 0.0:
        no_price = 1.0 - yes_price
    return yes_price, no_price


def _parse_iso(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


# ---------- Order placement ----------


@dataclass
class OrderResult:
    success: bool
    order_id: str | None
    tx_hash: str | None
    shares: float | None
    failure_reason: str | None


async def place_order(
    settings: Settings,
    *,
    market: Market,
    side: str,  # 'YES' | 'NO'
    stake_usdc: float,
    price: float,
) -> OrderResult:
    """Place a limit order on Polymarket CLOB.

    In dry_run mode this returns a synthetic OrderResult without
    touching the wire. In live mode it requires py-clob-client and
    the Polygon private key configured at startup.

    The current shape uses py-clob-client (v1) — when v2 stabilises we
    swap the import and the call shape (the wider Settings already
    points at the CLOB URL).
    """
    if settings.dry_run:
        log.info(
            "dry_run: would place %s order on %s (%.4f USDC @ %.4f)",
            side,
            market.id,
            stake_usdc,
            price,
        )
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=None,
            failure_reason="dry_run",
        )

    if not settings.polygon_private_key:
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=None,
            failure_reason="POLYGON_PRIVATE_KEY not set — cannot place live order",
        )
    if not settings.polymarket_deposit_wallet:
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=None,
            failure_reason=(
                "POLYMARKET_DEPOSIT_WALLET not set — deploy the deposit "
                "wallet by logging into polymarket.com once, then copy the "
                "address from polymarket.com/settings"
            ),
        )

    try:
        # Imported lazily — only needed for live orders. Keeps the
        # scan-only / dry-run path importable without the SDK.
        from py_clob_client_v2 import ClobClient, OrderArgs, PartialCreateOrderOptions
        from py_clob_client_v2.order_builder.constants import BUY
    except ImportError as e:
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=None,
            failure_reason=f"py-clob-client-v2 not installed: {e}",
        )

    token_id = _pick_token_id(market, side)
    if not token_id:
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=None,
            failure_reason=f"no token_id found for side={side} on market {market.id}",
        )

    shares = stake_usdc / price if price > 0 else 0.0

    try:
        # First instantiate without creds to derive the L2 API key, then
        # re-instantiate with creds + funder + signature_type=3 (POLY_1271).
        bootstrap = ClobClient(
            host=settings.clob_url,
            chain_id=137,  # Polygon mainnet
            key=settings.polygon_private_key,
        )
        creds = bootstrap.create_or_derive_api_key()

        client = ClobClient(
            host=settings.clob_url,
            chain_id=137,
            key=settings.polygon_private_key,
            creds=creds,
            signature_type=3,  # POLY_1271 deposit-wallet flow
            funder=settings.polymarket_deposit_wallet,
        )

        tick_size = _market_tick_size(market)
        neg_risk = bool(market.raw.get("negRisk") or market.raw.get("neg_risk"))
        resp = client.create_and_post_order(
            OrderArgs(token_id=token_id, price=price, size=shares, side=BUY),
            options=PartialCreateOrderOptions(tick_size=tick_size, neg_risk=neg_risk),
        )
    except Exception as e:
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=None,
            failure_reason=f"clob error: {type(e).__name__}: {e}",
        )

    if not isinstance(resp, dict) or not resp.get("success", True):
        return OrderResult(
            success=False,
            order_id=None,
            tx_hash=None,
            shares=shares,
            failure_reason=f"clob rejected: {resp}",
        )
    return OrderResult(
        success=True,
        order_id=resp.get("orderID") or resp.get("orderId") or resp.get("id"),
        tx_hash=resp.get("transactionHash") or resp.get("txHash"),
        shares=shares,
        failure_reason=None,
    )


def _market_tick_size(market: Market) -> str:
    """Tick size from the market metadata, defaulting to 0.01."""
    raw = market.raw.get("orderPriceMinTickSize") or market.raw.get("tickSize")
    if raw is None:
        return "0.01"
    return str(raw)


def _pick_token_id(market: Market, side: str) -> str | None:
    """Find the token_id for the requested side from the market metadata."""
    target = side.upper()
    for t in market.tokens:
        if not isinstance(t, dict):
            continue
        outcome = (t.get("outcome") or t.get("name") or "").upper()
        if outcome == target:
            return t.get("token_id") or t.get("tokenId") or t.get("id")
    # Some Gamma responses give two stringified token IDs in clobTokenIds
    # ordered [YES, NO]. Fall back to that.
    raw_ids = market.raw.get("clobTokenIds")
    if isinstance(raw_ids, str):
        try:
            import json

            raw_ids = json.loads(raw_ids)
        except Exception:
            raw_ids = None
    if isinstance(raw_ids, list) and len(raw_ids) >= 2:
        return str(raw_ids[0]) if target == "YES" else str(raw_ids[1])
    return None


# ---------- Geoblock pre-flight ----------


@dataclass
class GeoblockStatus:
    blocked: bool
    country: str
    region: str
    raw: dict[str, Any]


async def check_geoblock(_settings: Settings | None = None) -> GeoblockStatus:
    """Hit polymarket.com/api/geoblock from the bot's egress IP.
    Blocked statuses fail the bot startup so we never silently send
    orders that the CLOB will reject."""
    url = "https://polymarket.com/api/geoblock"
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        payload = r.json()
    return GeoblockStatus(
        blocked=bool(payload.get("blocked")),
        country=str(payload.get("country") or ""),
        region=str(payload.get("region") or ""),
        raw=payload,
    )


# ---------- Resolution lookup ----------


async def fetch_market_resolution(settings: Settings, market_id: str) -> dict[str, Any]:
    """Return the latest Gamma payload for a market. The caller checks
    `closed` / `resolved` / `outcomePrices` to decide if it's settled."""
    url = f"{settings.gamma_url}/markets"
    params = {"condition_ids": market_id}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        payload = r.json()
    raw_markets = payload if isinstance(payload, list) else payload.get("data", [])
    if not raw_markets:
        return {}
    return raw_markets[0]
