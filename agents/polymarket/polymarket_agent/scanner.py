"""End-to-end scan cycle: fetch markets → filter → reason → bet → record."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from .bankroll import gate_check, size_bet
from .config import Settings
from .markets import candidate_markets
from .polymarket import OrderResult, fetch_open_markets, place_order
from .reasoning import Decision, ReasoningError, reason_about_market
from .supabase_client import BetRecord, get_client, increment_bets_today, insert_bet

log = logging.getLogger(__name__)


@dataclass
class ScanReport:
    markets_fetched: int
    candidates: int
    decisions_made: int
    bets_placed: int
    bets_failed: int
    skipped_reasons: list[str]


async def run_scan_cycle(
    settings: Settings, *, max_decisions: int | None = None
) -> ScanReport:
    """One scan tick.

    `max_decisions` caps the number of LLM calls (each call costs USDC
    on the rail). Defaults to `max_bets_per_day` so a single cycle
    cannot exceed the daily cap even if every market triggers a bet.
    """
    client = get_client(settings)
    can_bet, reason, snapshot = gate_check(client, settings)
    if not can_bet:
        log.info("scan: gate closed (%s); skipping cycle", reason)
        return ScanReport(0, 0, 0, 0, 0, [f"gate: {reason}"])

    log.info(
        "scan: bankroll=%.2f locked=%.2f available=%.2f pnl=%.2f drawdown=%.1f%%",
        snapshot.total_usdc,
        snapshot.locked_in_open_bets_usdc,
        snapshot.available_usdc,
        snapshot.realised_pnl_usdc,
        snapshot.drawdown_pct * 100,
    )

    markets = await fetch_open_markets(settings)
    candidates = candidate_markets(markets, settings)
    log.info("scan: fetched %d markets, %d candidates", len(markets), len(candidates))

    if max_decisions is None:
        max_decisions = settings.max_bets_per_day

    decisions = 0
    placed = 0
    failed = 0
    skipped: list[str] = []

    for market in candidates:
        if decisions >= max_decisions:
            skipped.append(f"capped reasoning at {max_decisions} markets/cycle")
            break

        # Recompute the gate inside the loop — a successful bet
        # increments bets_today and may close the daily cap.
        can_bet, gate_reason, snapshot = gate_check(client, settings)
        if not can_bet:
            skipped.append(f"gate closed mid-loop: {gate_reason}")
            break

        try:
            decision: Decision = await reason_about_market(
                market, settings=settings, bankroll_usdc=snapshot.total_usdc
            )
        except ReasoningError as e:
            log.warning("reasoning failed for %s: %s", market.id, e)
            skipped.append(f"reasoning_error:{market.id[:8]}")
            continue
        decisions += 1

        if decision.decision == "PASS" or decision.confidence < settings.min_confidence:
            log.info(
                "scan: PASS market=%s decision=%s conf=%.2f rationale=%s",
                market.id[:8],
                decision.decision,
                decision.confidence,
                decision.rationale[:120],
            )
            skipped.append(
                f"low_conf:{market.id[:8]}:{decision.confidence:.2f}"
            )
            continue

        stake_usdc = size_bet(decision.size_factor, settings=settings, snapshot=snapshot)
        if stake_usdc < 1.0:
            skipped.append(f"stake_below_min:{market.id[:8]}")
            continue

        # Pick the price for the chosen side. Polymarket orders are
        # placed against the side's *price* — buying YES at p costs p
        # USDC per share.
        price = market.yes_price if decision.decision == "YES" else market.no_price
        if price <= 0 or price >= 1:
            skipped.append(f"bad_price:{market.id[:8]}")
            continue

        order: OrderResult = await place_order(
            settings,
            market=market,
            side=decision.decision,
            stake_usdc=stake_usdc,
            price=price,
        )

        status = "open" if order.success else "failed"
        failure_reason = None if order.success else order.failure_reason

        bet = BetRecord(
            market_id=market.id,
            market_question=market.question,
            market_category=market.category,
            market_close_at=market.end_date.isoformat() if market.end_date else None,
            side=decision.decision,
            stake_usdc=stake_usdc,
            price=price,
            shares=order.shares,
            receipt_id=str(decision.receipt.get("inference_id") or "")
            or _raise(ReasoningError("receipt missing inference_id")),
            agent_pubkey=decision.agent_pubkey,
            model=decision.model,
            reasoning_text=_compose_reasoning_text(decision),
            reasoning_excerpt=decision.rationale[:240],
            confidence=decision.confidence,
            order_id=order.order_id,
            tx_hash=order.tx_hash,
            status=status,
            failure_reason=failure_reason,
        )
        try:
            row = insert_bet(client, bet)
            log.info(
                "scan: recorded bet id=%s market=%s side=%s stake=%.2f status=%s",
                row["id"],
                market.id[:8],
                decision.decision,
                stake_usdc,
                status,
            )
            if order.success:
                placed += 1
                increment_bets_today(client)
            else:
                failed += 1
        except Exception as e:
            log.exception("supabase insert failed for market %s: %s", market.id, e)
            failed += 1

    return ScanReport(
        markets_fetched=len(markets),
        candidates=len(candidates),
        decisions_made=decisions,
        bets_placed=placed,
        bets_failed=failed,
        skipped_reasons=skipped,
    )


def _compose_reasoning_text(decision: Decision) -> str:
    lines = [
        f"Decision: {decision.decision} (confidence {decision.confidence:.2f})",
        f"Edge: {decision.edge_bps} bps",
        f"Size factor: {decision.size_factor:.2f}",
        "",
        "Rationale:",
        decision.rationale,
        "",
        "Key signals:",
    ]
    for s in decision.key_signals:
        lines.append(f"  - {s}")
    lines.extend(
        [
            "",
            f"Resolution source: {decision.resolution_source}",
            "",
            "Risk notes:",
            decision.risk_notes,
        ]
    )
    return "\n".join(lines)


def _raise(exc: Exception):  # tiny helper to inline a raise in expressions
    raise exc
