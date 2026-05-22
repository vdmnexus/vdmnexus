"""Round-trip tests for the Python SDK.

The first test is the load-bearing one: it proves that the bytes we sign
are the bytes a Nexus server can verify with the corresponding public
key. If this breaks, every paid call from a Python agent will be
rejected with `invalid_signature`.
"""

from __future__ import annotations

import base58
import httpx
import pytest
import respx
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from vdm_nexus import Agent


def test_sign_and_verify_round_trip() -> None:
    agent = Agent.generate()
    body = b'{"prompt":"hello","task_type":"general","nonce":"abc","timestamp":1}'

    signature_b58 = agent.sign_body(body)
    signature = base58.b58decode(signature_b58)

    # Recovering the public key from the agent's base58 pubkey mirrors
    # what the Nexus server does with the X-Agent-Pubkey header.
    pubkey_bytes = base58.b58decode(agent.pubkey)
    verify_key = VerifyKey(pubkey_bytes)
    # Raises BadSignatureError if the signature does not match.
    verify_key.verify(body, signature)


def test_bad_signature_rejected() -> None:
    agent = Agent.generate()
    body = b'{"prompt":"hello"}'
    other = Agent.generate()
    sig = base58.b58decode(other.sign_body(body))
    verify_key = VerifyKey(base58.b58decode(agent.pubkey))
    with pytest.raises(BadSignatureError):
        verify_key.verify(body, sig)


def test_from_base58_round_trip() -> None:
    a1 = Agent.generate()
    a2 = Agent.from_base58(a1.secret_key_base58)
    assert a1.pubkey == a2.pubkey
    assert a1.secret_key_base58 == a2.secret_key_base58


def test_secret_key_length_validation() -> None:
    with pytest.raises(ValueError, match="64 bytes"):
        Agent(b"\x00" * 32)


@pytest.mark.asyncio
@respx.mock
async def test_inference_signs_exact_body_bytes_sent() -> None:
    agent = Agent.generate()
    captured: dict[str, object] = {}

    def _handler(request: httpx.Request) -> httpx.Response:
        # The server's job: verify the signature against the raw body
        # bytes it received. We do exactly that here.
        sig = base58.b58decode(request.headers["X-Nexus-Signature"])
        pub = base58.b58decode(request.headers["X-Agent-Pubkey"])
        VerifyKey(pub).verify(request.content, sig)
        captured["body"] = request.content
        return httpx.Response(
            200,
            json={
                "ok": True,
                "result": "pong",
                "receipt": {
                    "agent_pubkey": agent.pubkey,
                    "provider": "groq",
                    "model": "llama-3-70b",
                    "cost_usdc": 0.0001,
                    "balance_remaining": 0.9999,
                    "prompt_hash": "deadbeef",
                    "response_hash": "cafebabe",
                    "timestamp": 1,
                    "inference_id": "id-1",
                },
            },
        )

    respx.post("https://nx.example/api/v1/inference").mock(side_effect=_handler)

    reply = await agent.inference(
        "https://nx.example/api/v1",
        prompt="ping",
        task_type="fast",
    )

    assert reply["ok"] is True
    assert reply["result"] == "pong"
    assert reply["receipt"]["cost_usdc"] == 0.0001
    # Body actually serialized → captured by the handler → signature valid.
    assert isinstance(captured["body"], bytes) and len(captured["body"]) > 0


@pytest.mark.asyncio
@respx.mock
async def test_inference_auto_grants_then_retries() -> None:
    agent = Agent.generate()
    calls = {"inference": 0, "grants": 0}

    def _inf(request: httpx.Request) -> httpx.Response:
        calls["inference"] += 1
        if calls["inference"] == 1:
            return httpx.Response(
                402, json={"ok": False, "error": "insufficient_credits"}
            )
        return httpx.Response(200, json={"ok": True, "result": "second-try"})

    def _grants(request: httpx.Request) -> httpx.Response:
        calls["grants"] += 1
        return httpx.Response(200, json={"ok": True, "grant_usdc": 0.10})

    respx.post("https://nx.example/api/v1/inference").mock(side_effect=_inf)
    respx.post("https://nx.example/api/v1/grants").mock(side_effect=_grants)

    reply = await agent.inference("https://nx.example/api/v1", prompt="ping")
    assert reply["ok"] is True
    assert reply["result"] == "second-try"
    assert calls["inference"] == 2
    assert calls["grants"] == 1
