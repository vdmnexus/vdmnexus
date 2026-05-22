"""Deterministic demo of the Python SDK's x402 handshake.

Used by `python-sdk-x402.tape`. The real `vdm_nexus.X402Agent` code
path executes — keypair, signed body, base64 X-Payment header, base58
payer — only the wire is faked via httpx.MockTransport so the render
is reproducible offline and never costs USDC.

The mock returns the same shape as production
`POST /api/v1/chat/completions`: an unpaid POST returns 402 with a
real-shape `X-Payment-Required` body; the paid retry returns an OpenAI
`chat.completion` body plus `X-Nexus-Receipt` and `X-Payment-Response`
headers. Receipt fields are realistic (sha256-correct hashes,
base58 keys, a real mainnet tx signature shape) but the SIR v2
`nexus_signature` is a placeholder — full signing happens inside
`apps/nexus/lib/receipts.ts` on the server.
"""

from __future__ import annotations

import asyncio
import base64
import json
import time
from hashlib import sha256

import base58
import httpx

from vdm_nexus import X402Agent
from vdm_nexus.x402 import (
    NETWORK_SOLANA_DEVNET,
    PAYMENT_REQUIRED_HEADER,
    PAYMENT_RESPONSE_HEADER,
    RECEIPT_HEADER,
)

ENDPOINT = "https://nexus.vdmnexus.com/api/v1"
MODEL = "openai/gpt-4o-mini"
PROMPT = "In one sentence: what is signed inference?"

# Stable canned response so the receipt's response_hash is deterministic.
REPLY_TEXT = (
    "Signed inference is an LLM call paired with an on-chain payment "
    "and a cryptographic receipt the caller can verify independently."
)


def _build_402_body() -> dict:
    return {
        "x402Version": 2,
        "resource": {
            "url": f"{ENDPOINT}/chat/completions",
            "description": "Nexus chat completions — signed inference",
            "method": "POST",
        },
        "accepts": [
            {
                "scheme": "exact",
                "network": NETWORK_SOLANA_DEVNET,
                "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
                "amount": "10000",
                "payTo": "DemoR3c1pi3nt7uK3JTW2gPnv4Qzbo3jHwjCnHd8YJX",
                "maxTimeoutSeconds": 60,
                "extra": {"feePayer": "FacBgvJ7tT3p5n4ckqRbz1QPnvJZx7H4LDXz2yqLHCWE"},
            }
        ],
    }


def _build_completion_body() -> dict:
    return {
        "id": "chatcmpl-demo-7e6a1c",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": MODEL,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": REPLY_TEXT},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 18, "completion_tokens": 32, "total_tokens": 50},
    }


def _build_receipt(agent_pubkey: str, tx_sig: str) -> dict:
    prompt_hash = sha256(PROMPT.encode("utf-8")).hexdigest()
    response_hash = sha256(REPLY_TEXT.encode("utf-8")).hexdigest()
    return {
        "v": 2,
        "agent_pubkey": agent_pubkey,
        "provider": "openrouter",
        "model": MODEL,
        "cost_usdc": 0.01,
        "balance_remaining": 0.0,
        "prompt_hash": prompt_hash,
        "response_hash": response_hash,
        "timestamp": int(time.time() * 1000),
        "inference_id": "demo-inf-9b41",
        "payment": {
            "network": "solana:devnet",
            "tx_signature": tx_sig,
            "pay_to": "DemoR3c1pi3nt7uK3JTW2gPnv4Qzbo3jHwjCnHd8YJX",
        },
        "nexus_signature": "demo_signature_present_on_server_side_only",
    }


def make_transport(agent_pubkey: str) -> httpx.MockTransport:
    """Return a transport that emulates the unpaid → paid 402 handshake."""

    state = {"calls": 0}
    # base58-shape signature (88 chars) — fake but well-formed.
    tx_sig = base58.b58encode(b"x402demo_signature_payload_pad").decode() + "Demo"
    tx_sig = tx_sig[:88]

    def handler(request: httpx.Request) -> httpx.Response:
        state["calls"] += 1
        if state["calls"] == 1:
            return httpx.Response(
                status_code=402,
                headers={
                    PAYMENT_REQUIRED_HEADER: base64.b64encode(
                        json.dumps(_build_402_body()).encode()
                    ).decode()
                },
                json={"error": "payment_required"},
            )
        return httpx.Response(
            status_code=200,
            headers={
                RECEIPT_HEADER: base64.b64encode(
                    json.dumps(_build_receipt(agent_pubkey, tx_sig)).encode()
                ).decode(),
                PAYMENT_RESPONSE_HEADER: base64.b64encode(
                    json.dumps(
                        {
                            "status": "settled",
                            "txSignature": tx_sig,
                            "network": "solana:devnet",
                        }
                    ).encode()
                ).decode(),
            },
            json=_build_completion_body(),
        )

    return httpx.MockTransport(handler)


async def main() -> None:
    agent = X402Agent.generate()
    print(f"agent pubkey:  {agent.pubkey}")
    print(f"endpoint:      {ENDPOINT}/chat/completions")
    print(f"network:       solana:devnet  (mocked transport)")
    print()

    # Patch the agent to use a stub builder so we don't need a live RPC.
    async def _stub_builder(*args, **kwargs):  # type: ignore[no-untyped-def]
        return {
            "transaction": base64.b64encode(b"fake_partially_signed_tx").decode(),
            "payer": agent.pubkey,
        }

    agent.build_payment_payload = _stub_builder  # type: ignore[assignment]

    async with httpx.AsyncClient(transport=make_transport(agent.pubkey)) as client:
        result = await agent.pay_and_infer(
            ENDPOINT,
            model=MODEL,
            messages=[{"role": "user", "content": PROMPT}],
            network="solana:devnet",
            client=client,
        )

    print("--- assistant reply ---")
    print(result.openai["choices"][0]["message"]["content"])
    print()
    print("--- SIR v2 receipt ---")
    print(json.dumps(result.receipt, indent=2))
    print()
    print("paid in: 0.01 USDC on solana:devnet")
    print(f"tx: https://solscan.io/tx/{result.receipt['payment']['tx_signature']}?cluster=devnet")


if __name__ == "__main__":
    asyncio.run(main())
