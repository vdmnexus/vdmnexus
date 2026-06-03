"""Thin Supabase service-role client + the bet / state writers.

The schema is owned by the migration at the repo root; this module
only writes and reads. RLS is enabled and the polymarket_* tables
have no policies, so anon access is blocked entirely.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from typing import Any

from supabase import Client, create_client

from .config import Settings


def get_client(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@dataclass
class BetRecord:
    market_id: str
    market_question: str
    market_category: str | None
    market_close_at: str | None  # ISO 8601
    side: str  # 'YES' | 'NO'
    stake_usdc: float
    price: float
    shares: float | None
    receipt_id: str
    agent_pubkey: str
    model: str
    reasoning_text: str
    reasoning_excerpt: str | None
    confidence: float | None
    order_id: str | None
    tx_hash: str | None
    status: str = "open"
    failure_reason: str | None = None


def insert_bet(client: Client, bet: BetRecord) -> dict[str, Any]:
    """Insert a bet row and return the inserted record (with id).
    Raises if Supabase rejects (constraint violation, network, etc.)."""
    payload = asdict(bet)
    res = client.table("polymarket_bets").insert(payload).execute()
    if not res.data:
        raise RuntimeError("polymarket_bets insert returned no row")
    return res.data[0]


def update_bet_resolution(
    client: Client,
    bet_id: str,
    *,
    resolved_outcome: str,
    pnl_usdc: float,
    resolved_at: datetime | None = None,
) -> None:
    res = (
        client.table("polymarket_bets")
        .update(
            {
                "status": "resolved",
                "resolved_outcome": resolved_outcome,
                "pnl_usdc": pnl_usdc,
                "resolved_at": (resolved_at or datetime.now(timezone.utc)).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", bet_id)
        .execute()
    )
    if not res.data:
        raise RuntimeError(f"polymarket_bets update for {bet_id} returned no row")


def get_open_bets(client: Client) -> list[dict[str, Any]]:
    res = (
        client.table("polymarket_bets")
        .select("*")
        .eq("status", "open")
        .order("created_at", desc=False)
        .execute()
    )
    return res.data or []


def get_recent_bets(client: Client, limit: int = 100) -> list[dict[str, Any]]:
    res = (
        client.table("polymarket_bets")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def get_agent_state(client: Client) -> dict[str, Any]:
    res = (
        client.table("polymarket_agent_state").select("*").eq("id", "singleton").execute()
    )
    if not res.data:
        # Bootstrap if the migration's insert didn't run for any reason.
        client.table("polymarket_agent_state").insert({"id": "singleton"}).execute()
        return get_agent_state(client)
    return res.data[0]


def increment_bets_today(client: Client) -> int:
    state = get_agent_state(client)
    today = date.today().isoformat()
    if state["bets_today_date"] == today:
        new_count = state["bets_today"] + 1
    else:
        new_count = 1
    client.table("polymarket_agent_state").update(
        {
            "bets_today": new_count,
            "bets_today_date": today,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", "singleton").execute()
    return new_count


def pause_agent(client: Client, reason: str) -> None:
    client.table("polymarket_agent_state").update(
        {
            "paused": True,
            "pause_reason": reason,
            "paused_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", "singleton").execute()


def unpause_agent(client: Client) -> None:
    client.table("polymarket_agent_state").update(
        {
            "paused": False,
            "pause_reason": None,
            "paused_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", "singleton").execute()
