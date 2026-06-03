"""Bankroll bookkeeping + the drawdown auto-pause guard.

Bankroll is derived from the bets table — open stakes count as
locked, resolved bets contribute realised PnL. The
polymarket_agent_state singleton stores the daily counter and the
paused flag.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from supabase import Client

from .config import Settings
from .supabase_client import get_agent_state, pause_agent

log = logging.getLogger(__name__)


@dataclass
class BankrollSnapshot:
    initial_usdc: float
    locked_in_open_bets_usdc: float
    realised_pnl_usdc: float
    available_usdc: float
    total_usdc: float
    drawdown_pct: float


def compute_bankroll(client: Client, settings: Settings) -> BankrollSnapshot:
    state = get_agent_state(client)
    initial = float(state.get("initial_bankroll_usdc") or 500.0)

    bets = client.table("polymarket_bets").select(
        "stake_usdc, pnl_usdc, status"
    ).execute().data or []

    locked = 0.0
    realised = 0.0
    for b in bets:
        if b["status"] == "open":
            locked += float(b.get("stake_usdc") or 0.0)
        elif b["status"] == "resolved":
            realised += float(b.get("pnl_usdc") or 0.0)
        # cancelled/failed contribute nothing

    total = initial + realised
    available = total - locked
    drawdown = max(0.0, (initial - total) / initial) if initial > 0 else 0.0

    return BankrollSnapshot(
        initial_usdc=initial,
        locked_in_open_bets_usdc=locked,
        realised_pnl_usdc=realised,
        available_usdc=available,
        total_usdc=total,
        drawdown_pct=drawdown,
    )


def seven_day_drawdown_pct(client: Client) -> float:
    """Compute drawdown over the last 7 days of resolved bets."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    bets = (
        client.table("polymarket_bets")
        .select("stake_usdc, pnl_usdc")
        .eq("status", "resolved")
        .gte("resolved_at", cutoff)
        .execute()
        .data
        or []
    )
    total_staked = sum(float(b["stake_usdc"]) for b in bets if b.get("stake_usdc"))
    if total_staked <= 0:
        return 0.0
    total_pnl = sum(float(b["pnl_usdc"] or 0.0) for b in bets)
    return max(0.0, -total_pnl / total_staked)


def gate_check(
    client: Client,
    settings: Settings,
) -> tuple[bool, str | None, BankrollSnapshot]:
    """Returns (can_bet, reason_if_not, snapshot)."""
    state = get_agent_state(client)

    if state.get("paused"):
        return False, f"agent paused: {state.get('pause_reason')}", compute_bankroll(client, settings)

    today = datetime.now(timezone.utc).date().isoformat()
    if state["bets_today_date"] == today and state["bets_today"] >= settings.max_bets_per_day:
        return (
            False,
            f"daily cap reached ({state['bets_today']}/{settings.max_bets_per_day})",
            compute_bankroll(client, settings),
        )

    snapshot = compute_bankroll(client, settings)
    if snapshot.available_usdc < 1.0:
        return False, f"available bankroll too low ({snapshot.available_usdc:.2f} USDC)", snapshot

    drawdown_7d = seven_day_drawdown_pct(client)
    if drawdown_7d >= settings.drawdown_pause_pct:
        reason = f"7-day drawdown {drawdown_7d:.1%} >= pause threshold {settings.drawdown_pause_pct:.1%}"
        pause_agent(client, reason)
        _alert(settings, f"Polymarket agent paused: {reason}")
        return False, reason, snapshot

    return True, None, snapshot


def size_bet(
    decision_size_factor: float, *, settings: Settings, snapshot: BankrollSnapshot
) -> float:
    """Return the stake in USDC, applying every hard cap."""
    cap_per_bet = settings.max_bet_usdc
    cap_market_fraction = snapshot.total_usdc * settings.max_bankroll_fraction
    cap_available = snapshot.available_usdc
    cap = min(cap_per_bet, cap_market_fraction, cap_available)
    stake = max(0.0, decision_size_factor * cap)
    # Round down to two decimal places to keep order math clean.
    return round(stake, 2)


def _alert(settings: Settings, message: str) -> None:
    log.warning("[ALERT] %s", message)
    if not (settings.telegram_bot_token and settings.telegram_chat_id):
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            data={"chat_id": settings.telegram_chat_id, "text": message},
            timeout=10.0,
        )
    except Exception as e:
        log.warning("telegram alert failed: %s", e)
