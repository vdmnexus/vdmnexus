"""Round-trip test for `ChatNexus`.

Constructs a `ChatNexus`, stubs the x402 payment-payload construction
(so the test never touches Solana RPC), mocks the
`/chat/completions` endpoint, and asserts:

  1. The handshake actually happens (probe + paid POST).
  2. `invoke([HumanMessage])` returns the assistant text.
  3. `response_metadata["nexus_receipt"]` carries the parsed SIR v2.
  4. `response_metadata["nexus_payment"]` carries the X-Payment-Response.
"""

from __future__ import annotations

import base64
import json
from typing import Any

import httpx
import pytest
import respx
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from langchain_vdm_nexus import ChatNexus
from vdm_nexus import NETWORK_SOLANA_MAINNET, X402Agent
from vdm_nexus.x402 import _encode_b64_json

FAKE_RECIPIENT = "GqYU2X4tQMjFmHnxYbN3VFx5tQv2eYZBXqRvWcF4Aaaa"


def _b64(obj: Any) -> str:
    return base64.b64encode(json.dumps(obj).encode("utf-8")).decode("ascii")


def _challenge() -> dict[str, Any]:
    return {
        "x402Version": 2,
        "accepts": [
            {
                "scheme": "exact",
                "network": NETWORK_SOLANA_MAINNET,
                "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "amount": "10000",
                "payTo": FAKE_RECIPIENT,
                "maxTimeoutSeconds": 60,
                "extra": {"feePayer": FAKE_RECIPIENT},
            }
        ],
    }


def _completion(text: str = "pong") -> dict[str, Any]:
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "openai/gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": text},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 4, "completion_tokens": 1, "total_tokens": 5},
    }


def _receipt(agent_pubkey: str) -> dict[str, Any]:
    return {
        "v": 2,
        "agent_pubkey": agent_pubkey,
        "model": "openai/gpt-4o-mini",
        "cost_usdc": 0.0008,
        "prompt_hash": "a" * 64,
        "response_hash": "b" * 64,
        "timestamp": 1700000000,
        "inference_id": 12345,
        "points_total": 1,
        "upstream": "openrouter",
        "payment": {
            "scheme": "x402",
            "amount_usdc": 0.01,
            "tx_signature": "MOCK_TX_SIGNATURE",
            "network": NETWORK_SOLANA_MAINNET,
            "pay_to": FAKE_RECIPIENT,
        },
        "nexus_signature": "MOCK_SIGNATURE",
    }


def _payment_response() -> dict[str, Any]:
    return {
        "status": "settled",
        "txSignature": "MOCK_TX_SIGNATURE",
        "network": NETWORK_SOLANA_MAINNET,
    }


def test_chatnexus_requires_secret_or_agent() -> None:
    llm = ChatNexus(endpoint="https://nx.example/api/v1")
    with pytest.raises(ValueError, match="secret_key"):
        llm.invoke([HumanMessage(content="x")])


def test_chatnexus_constructs_with_secret_key() -> None:
    agent = X402Agent.generate()
    llm = ChatNexus(secret_key=agent.secret_key_base58)
    assert llm._llm_type == "vdm-nexus"


@respx.mock
def test_chatnexus_invoke_returns_content_and_receipt(monkeypatch) -> None:
    agent = X402Agent.generate()
    calls: list[dict[str, Any]] = []

    async def _stub_payload(
        self, challenge, *, network, rpc_url=None, client=None
    ):
        return {
            "x402Version": 2,
            "scheme": "exact",
            "network": network,
            "payload": {"transaction": "fake", "payer": self.pubkey},
        }

    monkeypatch.setattr(X402Agent, "build_payment_payload", _stub_payload)

    def _handler(request: httpx.Request) -> httpx.Response:
        has_payment = "x-payment" in {k.lower() for k in request.headers}
        calls.append({"has_payment": has_payment, "body": request.content})
        if not has_payment:
            return httpx.Response(
                402, headers={"X-Payment-Required": _b64(_challenge())}, json={}
            )
        return httpx.Response(
            200,
            json=_completion("hello from nexus"),
            headers={
                "X-Nexus-Receipt": _b64(_receipt(agent.pubkey)),
                "X-Payment-Response": _b64(_payment_response()),
            },
        )

    respx.post("https://nx.example/api/v1/chat/completions").mock(
        side_effect=_handler
    )

    llm = ChatNexus(
        agent=agent,
        endpoint="https://nx.example/api/v1",
        model="openai/gpt-4o-mini",
        network="solana:mainnet",
    )

    reply = llm.invoke(
        [
            SystemMessage(content="be brief"),
            HumanMessage(content="say pong"),
        ]
    )

    assert isinstance(reply, AIMessage)
    assert reply.content == "hello from nexus"
    # Receipt + payment flowed through.
    assert reply.response_metadata["nexus_receipt"]["v"] == 2
    assert (
        reply.response_metadata["nexus_receipt"]["payment"]["tx_signature"]
        == "MOCK_TX_SIGNATURE"
    )
    assert reply.response_metadata["nexus_payment"]["txSignature"] == "MOCK_TX_SIGNATURE"
    # Token usage.
    assert reply.usage_metadata is not None
    assert reply.usage_metadata["total_tokens"] == 5

    # The handshake actually ran — one probe + one paid retry.
    assert len(calls) == 2
    assert calls[0]["has_payment"] is False
    assert calls[1]["has_payment"] is True

    # The body of the paid retry must carry the OpenAI-shape messages
    # converted from LangChain BaseMessages.
    sent = json.loads(calls[1]["body"])
    assert sent["model"] == "openai/gpt-4o-mini"
    roles = [m["role"] for m in sent["messages"]]
    assert roles == ["system", "user"]


@respx.mock
@pytest.mark.asyncio
async def test_chatnexus_ainvoke_async_path(monkeypatch) -> None:
    """`ainvoke` exercises `_agenerate` directly without the thread bridge."""
    agent = X402Agent.generate()

    async def _stub_payload(
        self, challenge, *, network, rpc_url=None, client=None
    ):
        return {
            "x402Version": 2,
            "scheme": "exact",
            "network": network,
            "payload": {"transaction": "fake", "payer": self.pubkey},
        }

    monkeypatch.setattr(X402Agent, "build_payment_payload", _stub_payload)

    def _handler(request: httpx.Request) -> httpx.Response:
        has_payment = "x-payment" in {k.lower() for k in request.headers}
        if not has_payment:
            return httpx.Response(
                402, headers={"X-Payment-Required": _b64(_challenge())}, json={}
            )
        return httpx.Response(
            200,
            json=_completion("async pong"),
            headers={
                "X-Nexus-Receipt": _b64(_receipt(agent.pubkey)),
                "X-Payment-Response": _b64(_payment_response()),
            },
        )

    respx.post("https://nx.example/api/v1/chat/completions").mock(
        side_effect=_handler
    )

    llm = ChatNexus(
        agent=agent,
        endpoint="https://nx.example/api/v1",
    )

    reply = await llm.ainvoke([HumanMessage(content="hi")])
    assert reply.content == "async pong"
    assert reply.response_metadata["nexus_receipt"]["agent_pubkey"] == agent.pubkey
