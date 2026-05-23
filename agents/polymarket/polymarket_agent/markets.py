"""Market filtering — turns a Gamma dump into a small candidate list."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .config import Settings
from .polymarket import Market

CATEGORY_ALIASES: dict[str, set[str]] = {
    "politics": {"politics", "elections", "us-current-affairs"},
    "economics": {"economics", "economy", "macro"},
    "sports": {"sports"},
    "crypto": {"crypto", "cryptocurrency"},
    "geopolitics": {"geopolitics", "world", "us-current-affairs"},
}


def matches_category(market: Market, target_categories: tuple[str, ...]) -> bool:
    if not target_categories:
        return True
    if not market.category:
        # If the market has no category, accept only when the operator
        # opted into the wildcard (empty tuple already handled above).
        return False
    market_cat = market.category.lower()
    for cat in target_categories:
        if market_cat == cat:
            return True
        if market_cat in CATEGORY_ALIASES.get(cat, set()):
            return True
    return False


def candidate_markets(
    markets: list[Market], settings: Settings, *, now: datetime | None = None
) -> list[Market]:
    """Apply the deterministic pre-filters before LLM reasoning."""
    now = now or datetime.now(timezone.utc)
    horizon = now + timedelta(hours=settings.min_time_to_close_hours)
    out: list[Market] = []
    for m in markets:
        if m.volume_usdc < settings.min_market_volume_usdc:
            continue
        if not matches_category(m, settings.categories):
            continue
        if m.end_date is None:
            # Unknown close time — skip rather than guess.
            continue
        if m.end_date < horizon:
            continue
        if m.yes_price <= 0 or m.yes_price >= 1:
            # Already-resolved or degenerate book.
            continue
        out.append(m)
    return out
