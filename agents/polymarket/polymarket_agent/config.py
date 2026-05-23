"""Settings, env loading, and hard-coded safety caps.

The hard caps are duplicated in code on purpose — the env variants
are knobs for *tightening* below the in-code maximum, never for
loosening past it. `effective_max_bet_usdc()` enforces this.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Hard caps. These are absolute ceilings — env can tighten, not loosen.
HARDCODED_MAX_BET_USDC = 50.0
HARDCODED_MAX_BETS_PER_DAY = 5
HARDCODED_MAX_BANKROLL_FRACTION = 0.30
HARDCODED_DRAWDOWN_PAUSE_PCT = 0.30


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def _env_required(name: str) -> str:
    value = _env(name)
    if value is None:
        raise RuntimeError(f"required env var not set: {name}")
    return value


def _env_float(name: str, default: float) -> float:
    raw = _env(name)
    if raw is None:
        return default
    return float(raw)


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    if raw is None:
        return default
    return int(raw)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = _env(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    # secrets
    polymarket_agent_secret_key: str
    polygon_private_key: str | None
    supabase_url: str
    supabase_service_role_key: str
    webhook_secret: str

    # nexus
    nexus_endpoint: str
    nexus_network: str
    reasoning_model: str

    # polymarket
    gamma_url: str
    clob_url: str
    dry_run: bool

    # caps (post-clamp)
    max_bet_usdc: float
    max_bets_per_day: int
    max_bankroll_fraction: float
    min_confidence: float
    min_market_volume_usdc: float
    min_time_to_close_hours: float
    drawdown_pause_pct: float

    # filter
    categories: tuple[str, ...]

    # optional
    telegram_bot_token: str | None
    telegram_chat_id: str | None
    newsapi_key: str | None


def load_settings(env_path: Path | None = None) -> Settings:
    """Load settings from env / dotenv. Clamps env-supplied caps to the
    in-code hardcoded ceilings."""
    if env_path is not None:
        load_dotenv(env_path)
    else:
        load_dotenv()

    max_bet = min(_env_float("MAX_BET_USDC", HARDCODED_MAX_BET_USDC), HARDCODED_MAX_BET_USDC)
    max_per_day = min(
        _env_int("MAX_BETS_PER_DAY", HARDCODED_MAX_BETS_PER_DAY),
        HARDCODED_MAX_BETS_PER_DAY,
    )
    max_fraction = min(
        _env_float("MAX_BANKROLL_FRACTION", HARDCODED_MAX_BANKROLL_FRACTION),
        HARDCODED_MAX_BANKROLL_FRACTION,
    )
    drawdown_pct = min(
        _env_float("DRAWDOWN_PAUSE_PCT", HARDCODED_DRAWDOWN_PAUSE_PCT),
        HARDCODED_DRAWDOWN_PAUSE_PCT,
    )

    categories_raw = _env("POLYMARKET_CATEGORIES", "politics,economics") or ""
    categories = tuple(c.strip().lower() for c in categories_raw.split(",") if c.strip())

    return Settings(
        polymarket_agent_secret_key=_env_required("POLYMARKET_AGENT_SECRET_KEY"),
        polygon_private_key=_env("POLYGON_PRIVATE_KEY"),
        supabase_url=_env_required("SUPABASE_URL"),
        supabase_service_role_key=_env_required("SUPABASE_SERVICE_ROLE_KEY"),
        webhook_secret=_env_required("WEBHOOK_SECRET"),
        nexus_endpoint=_env("NEXUS_ENDPOINT", "https://nexus.vdmnexus.com/api/v1") or "",
        nexus_network=_env("NEXUS_NETWORK", "solana:mainnet") or "solana:mainnet",
        reasoning_model=_env("REASONING_MODEL", "anthropic/claude-sonnet-4") or "",
        gamma_url=_env("POLYMARKET_GAMMA_URL", "https://gamma-api.polymarket.com") or "",
        clob_url=_env("POLYMARKET_CLOB_URL", "https://clob.polymarket.com") or "",
        dry_run=_env_bool("POLYMARKET_DRY_RUN", default=False),
        max_bet_usdc=max_bet,
        max_bets_per_day=max_per_day,
        max_bankroll_fraction=max_fraction,
        min_confidence=_env_float("MIN_CONFIDENCE", 0.60),
        min_market_volume_usdc=_env_float("MIN_MARKET_VOLUME_USDC", 10000.0),
        min_time_to_close_hours=_env_float("MIN_TIME_TO_CLOSE_HOURS", 24.0),
        drawdown_pause_pct=drawdown_pct,
        categories=categories,
        telegram_bot_token=_env("TELEGRAM_BOT_TOKEN"),
        telegram_chat_id=_env("TELEGRAM_CHAT_ID"),
        newsapi_key=_env("NEWSAPI_KEY"),
    )
