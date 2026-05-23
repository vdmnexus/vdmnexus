"""Resolution watcher.

Polls each open bet's Polymarket market. If the market has closed
and a winner is set, computes PnL and updates the bet row.

PnL math for prediction markets:
  - Bought YES at price p for stake s → shares = s/p
  - If YES wins: payout = shares * 1 = s/p; pnl = payout - s = s*(1/p - 1)
  - If YES loses: payout = 0; pnl = -s
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from .config import Settings
from .polymarket import fetch_market_resolution
from .supabase_client import get_client, get_open_bets, update_bet_resolution

log = logging.getLogger(__name__)


@dataclass
class ResolveReport:
    open_bets_checked: int
    resolved: int
    still_open: int
    errors: int


def _outcome_from_payload(payload: dict) -> str | None:
    """Return 'YES' / 'NO' / 'INVALID' if the market is settled, else None."""
    if not payload:
        return None
    if not payload.get("closed"):
        return None

    raw_prices = payload.get("outcomePrices")
    if isinstance(raw_prices, str):
        try:
            raw_prices = json.loads(raw_prices)
        except Exception:
            raw_prices = None

    if isinstance(raw_prices, list) and len(raw_prices) >= 2:
        try:
            yes_price = float(raw_prices[0])
            no_price = float(raw_prices[1])
        except (TypeError, ValueError):
            return None
        if yes_price >= 0.99 and no_price <= 0.01:
            return "YES"
        if no_price >= 0.99 and yes_price <= 0.01:
            return "NO"
        # Closed but ambiguous — UMA marked invalid or 50/50 resolution
        if abs(yes_price - no_price) < 0.05:
            return "INVALID"
    return None


def _pnl(side: str, outcome: str, stake_usdc: float, price: float) -> float:
    """Compute PnL in USDC for a closed bet."""
    if outcome == "INVALID":
        # Polymarket refunds stakes on invalid resolutions.
        return 0.0
    won = side == outcome
    if not won:
        return -stake_usdc
    if price <= 0:
        return 0.0
    payout = stake_usdc / price
    return round(payout - stake_usdc, 4)


async def run_resolve_cycle(settings: Settings) -> ResolveReport:
    client = get_client(settings)
    bets = get_open_bets(client)
    log.info("resolve: checking %d open bets", len(bets))

    resolved = 0
    still_open = 0
    errors = 0

    for bet in bets:
        try:
            payload = await fetch_market_resolution(settings, bet["market_id"])
        except Exception as e:
            log.warning("resolve: fetch failed for %s: %s", bet["market_id"], e)
            errors += 1
            continue

        outcome = _outcome_from_payload(payload)
        if outcome is None:
            still_open += 1
            continue

        pnl = _pnl(
            side=bet["side"],
            outcome=outcome,
            stake_usdc=float(bet["stake_usdc"]),
            price=float(bet["price"]),
        )
        try:
            update_bet_resolution(
                client, bet["id"], resolved_outcome=outcome, pnl_usdc=pnl
            )
            log.info(
                "resolve: bet=%s outcome=%s pnl=%.4f",
                bet["id"][:8],
                outcome,
                pnl,
            )
            resolved += 1
        except Exception as e:
            log.exception("resolve: update failed for bet %s: %s", bet["id"], e)
            errors += 1

    return ResolveReport(
        open_bets_checked=len(bets),
        resolved=resolved,
        still_open=still_open,
        errors=errors,
    )
