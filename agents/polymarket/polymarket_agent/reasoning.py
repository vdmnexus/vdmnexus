"""Reasoning call to the Nexus rail.

For each candidate market, this module:
  1. Renders the system prompt from `agents/polymarket/prompt.md`
  2. Builds a user message with the market state.
  3. Calls vdm-nexus X402Agent.pay_and_infer.
  4. Parses the JSON response.

Returns both the decision and the signed inference receipt so the
caller can write both to Supabase.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import Settings
from .polymarket import Market

log = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompt.md"


@dataclass
class Decision:
    decision: str  # 'YES' | 'NO' | 'PASS'
    confidence: float
    size_factor: float
    edge_bps: int
    rationale: str
    key_signals: list[str]
    resolution_source: str
    risk_notes: str
    raw_response: str
    receipt: dict[str, Any]
    model: str
    agent_pubkey: str


class ReasoningError(Exception):
    pass


def render_system_prompt(*, bankroll_usdc: float, settings: Settings) -> str:
    raw = PROMPT_PATH.read_text()
    raw = raw.replace("{{CURRENT_DATE}}", datetime.utcnow().strftime("%Y-%m-%d"))
    raw = raw.replace("{{BANKROLL_USDC}}", f"{bankroll_usdc:.2f}")
    raw = raw.replace("{{MAX_BET_USDC}}", f"{settings.max_bet_usdc:.2f}")
    raw = raw.replace("{{MAX_BETS_PER_DAY}}", str(settings.max_bets_per_day))
    raw = raw.replace("{{MAX_BANKROLL_FRACTION}}", f"{settings.max_bankroll_fraction:.2f}")
    return raw


def build_user_message(market: Market, *, extra_context: str | None = None) -> str:
    parts: list[str] = [
        "Analyse this Polymarket market and return your decision as a JSON object.",
        "",
        "## Market",
        f"- ID: {market.id}",
        f"- Question: {market.question}",
        f"- Category: {market.category or '(uncategorised)'}",
        f"- End date: {market.end_date.isoformat() if market.end_date else '(unknown)'}",
        f"- 24h volume (USDC): {market.volume_usdc:.0f}",
        f"- Current YES price: {market.yes_price:.4f}",
        f"- Current NO price: {market.no_price:.4f}",
        "",
        "## Market description",
        market.description or "(no description provided)",
    ]
    if extra_context:
        parts.extend(["", "## Additional context", extra_context])
    parts.extend(
        [
            "",
            "Return exactly one JSON object matching the schema in the system prompt. "
            "No prose before or after. No markdown fence.",
        ]
    )
    return "\n".join(parts)


def _extract_json(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        first = text.find("\n")
        last = text.rfind("```")
        if first != -1 and last != -1 and last > first:
            text = text[first + 1 : last].strip()
    if not text.startswith("{"):
        m = re.search(r"\{[\s\S]*\}", text)
        if m:
            text = m.group(0)
    return text


def _validate(payload: dict[str, Any]) -> None:
    required = {
        "decision",
        "confidence",
        "size_factor",
        "edge_bps",
        "rationale",
        "key_signals",
        "resolution_source",
        "risk_notes",
    }
    missing = required - payload.keys()
    if missing:
        raise ReasoningError(f"missing keys: {sorted(missing)}")
    if payload["decision"] not in {"YES", "NO", "PASS"}:
        raise ReasoningError(f"decision must be YES/NO/PASS, got {payload['decision']!r}")
    try:
        conf = float(payload["confidence"])
    except (TypeError, ValueError) as e:
        raise ReasoningError(f"confidence must be numeric: {e}") from e
    if not 0.0 <= conf <= 1.0:
        raise ReasoningError(f"confidence out of range: {conf}")
    try:
        size = float(payload["size_factor"])
    except (TypeError, ValueError) as e:
        raise ReasoningError(f"size_factor must be numeric: {e}") from e
    if not 0.0 <= size <= 1.0:
        raise ReasoningError(f"size_factor out of range: {size}")
    if payload["decision"] == "PASS" and size != 0.0:
        raise ReasoningError("PASS decisions must have size_factor=0")
    if not isinstance(payload["key_signals"], list):
        raise ReasoningError("key_signals must be a list")


async def reason_about_market(
    market: Market,
    *,
    settings: Settings,
    bankroll_usdc: float,
    extra_context: str | None = None,
) -> Decision:
    """Make the paid reasoning call. Raises ReasoningError on
    validation failure (the caller decides whether to skip the market
    or hard-fail the run)."""
    try:
        from vdm_nexus import X402Agent  # type: ignore
    except ImportError as e:
        raise ReasoningError(
            "vdm-nexus is not installed in this environment. "
            "Run: pip install vdm-nexus"
        ) from e

    system_prompt = render_system_prompt(bankroll_usdc=bankroll_usdc, settings=settings)
    user_message = build_user_message(market, extra_context=extra_context)

    agent = X402Agent.from_base58(settings.polymarket_agent_secret_key)
    log.info(
        "[reason] market=%s pubkey=%s model=%s network=%s",
        market.id[:8],
        agent.pubkey[:8],
        settings.reasoning_model,
        settings.nexus_network,
    )
    result = await agent.pay_and_infer(
        settings.nexus_endpoint,
        model=settings.reasoning_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        network=settings.nexus_network,
    )

    raw_text = result.openai["choices"][0]["message"]["content"]
    try:
        payload = json.loads(_extract_json(raw_text))
    except json.JSONDecodeError as e:
        raise ReasoningError(f"model output is not valid JSON: {e}") from e
    _validate(payload)

    return Decision(
        decision=payload["decision"],
        confidence=float(payload["confidence"]),
        size_factor=float(payload["size_factor"]),
        edge_bps=int(payload.get("edge_bps") or 0),
        rationale=str(payload["rationale"]),
        key_signals=[str(s) for s in payload["key_signals"]],
        resolution_source=str(payload["resolution_source"]),
        risk_notes=str(payload["risk_notes"]),
        raw_response=raw_text,
        receipt=result.receipt,
        model=settings.reasoning_model,
        agent_pubkey=agent.pubkey,
    )
