"""CLI entry point — `python -m polymarket_agent <command>`.

Commands:
  serve            Run the FastAPI webhook server (production deploy).
  scan             Run one scan cycle locally and print the report.
  resolve          Run one resolve cycle locally.
  bankroll         Print the current bankroll snapshot.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from dataclasses import asdict

from .bankroll import compute_bankroll
from .config import load_settings
from .resolver import run_resolve_cycle
from .scanner import run_scan_cycle
from .supabase_client import get_client


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="polymarket-agent",
        description="VDM Nexus Polymarket prediction-market agent.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("serve", help="Run the FastAPI webhook server.")
    p_scan = sub.add_parser("scan", help="Run one scan cycle locally.")
    p_scan.add_argument(
        "--max-decisions",
        type=int,
        default=None,
        help="Cap reasoning calls this cycle (defaults to MAX_BETS_PER_DAY).",
    )
    sub.add_parser("resolve", help="Poll Polymarket for resolved open bets.")
    sub.add_parser("bankroll", help="Print the current bankroll snapshot.")

    args = parser.parse_args()

    logging.basicConfig(
        level="INFO",
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if args.cmd == "serve":
        from .main import _run_uvicorn

        _run_uvicorn()
        return

    settings = load_settings()

    if args.cmd == "scan":
        report = asyncio.run(run_scan_cycle(settings, max_decisions=args.max_decisions))
        print(json.dumps(asdict(report), indent=2))
        return

    if args.cmd == "resolve":
        report = asyncio.run(run_resolve_cycle(settings))
        print(json.dumps(asdict(report), indent=2))
        return

    if args.cmd == "bankroll":
        client = get_client(settings)
        snapshot = compute_bankroll(client, settings)
        print(json.dumps(asdict(snapshot), indent=2))
        return

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
