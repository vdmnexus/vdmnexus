"""Round-trip tests for the x402 client.

These tests stub `X402Agent.build_payment_payload()` so they never
touch Solana RPC — the load-bearing behaviour under test is the wire
format of the probe → 402 → paid retry handshake against the Nexus
`/chat/completions` endpoint, NOT solders' SPL transfer encoding.

A separate `test_payment_payload_construction` exercises
`build_payment_payload()` end-to-end with a mocked RPC, so we still
catch regressions in the Solana-side code path.
"""

from __future__ import annotations

import base58
import base64
import json
from typing import Any

import httpx
import pytest
import respx

from vdm_nexus import (
    NETWORK_SOLANA_MAINNET,
    X402Agent,
    X402PaymentRequiredError,
    X402PaymentReplayError,
    X402Result,
    X402UpstreamError,
    resolve_network,
)
from vdm_nexus.x402 import (
    MEMO_PROGRAM_ID,
    SPL_TOKEN_PROGRAM_ID,
    _decode_b64_json,
    _encode_b64_json,
)

COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111"


FAKE_RECIPIENT = "GqYU2X4tQMjFmHnxYbN3VFx5tQv2eYZBXqRvWcF4Aaaa"
FAKE_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def _b64(obj: Any) -> str:
    return base64.b64encode(json.dumps(obj).encode("utf-8")).decode("ascii")


def _fake_challenge() -> dict[str, Any]:
    return {
        "x402Version": 2,
        "resource": {
            "url": "https://nx.example/api/v1/chat/completions",
            "description": "OpenAI-compatible chat completions, paid per call in USDC.",
            "serviceName": "VDM Nexus",
            "mimeType": "application/json",
        },
        "accepts": [
            {
                "scheme": "exact",
                "network": NETWORK_SOLANA_MAINNET,
                "asset": FAKE_USDC,
                "amount": "10000",  # 0.01 USDC, atomic
                "payTo": FAKE_RECIPIENT,
                "maxTimeoutSeconds": 60,
                "extra": {"feePayer": FAKE_RECIPIENT},
            }
        ],
    }


def _fake_completion() -> dict[str, Any]:
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "openai/gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "pong"},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
    }


def _fake_receipt(agent_pubkey: str) -> dict[str, Any]:
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


def _fake_payment_response() -> dict[str, Any]:
    return {
        "status": "settled",
        "txSignature": "MOCK_TX_SIGNATURE",
        "network": NETWORK_SOLANA_MAINNET,
    }


def test_header_codec_round_trip() -> None:
    obj = {"x402Version": 2, "scheme": "exact", "nested": {"k": "v"}}
    enc = _encode_b64_json(obj)
    dec = _decode_b64_json(enc)
    assert dec == obj


def test_resolve_network_aliases() -> None:
    assert resolve_network("mainnet") == NETWORK_SOLANA_MAINNET
    assert resolve_network("solana:mainnet") == NETWORK_SOLANA_MAINNET
    assert resolve_network("Solana-Mainnet") == NETWORK_SOLANA_MAINNET
    # Pass-through for unknown / already-canonical
    assert resolve_network(NETWORK_SOLANA_MAINNET) == NETWORK_SOLANA_MAINNET


def test_x402_agent_inherits_agent_api() -> None:
    agent = X402Agent.generate()
    # Inherits Agent surface — the prepaid path still works.
    assert isinstance(agent.pubkey, str)
    assert len(agent.secret_key) == 64
    body = b'{"hi":"there"}'
    sig = agent.sign_body(body)
    assert isinstance(sig, str) and len(sig) > 0


@pytest.mark.asyncio
@respx.mock
async def test_pay_and_infer_handshake_round_trip(monkeypatch) -> None:
    """The full probe → 402 → paid retry sequence against a mocked
    endpoint. Stubs payment-payload construction so we don't touch
    Solana RPC, but asserts the X-Payment header was sent on the
    retry and that the parsed receipt + payment_response flow out."""

    agent = X402Agent.generate()
    calls: list[dict[str, Any]] = []

    async def _stub_build_payload(
        self,
        challenge,
        *,
        network,
        rpc_url=None,
        client=None,
    ):
        # Mirror the real v2 shape so the assertions in the handler
        # validate the wire format we actually produce in prod.
        entry = challenge["accepts"][0]
        return {
            "x402Version": 2,
            "accepted": entry,
            "resource": challenge.get("resource"),
            "payload": {
                "transaction": "base64-fake-signed-tx",
                "payer": self.pubkey,
            },
        }

    monkeypatch.setattr(X402Agent, "build_payment_payload", _stub_build_payload)

    def _handler(request: httpx.Request) -> httpx.Response:
        has_payment = "x-payment" in {k.lower() for k in request.headers.keys()}
        payment_header = None
        for k, v in request.headers.items():
            if k.lower() == "x-payment":
                payment_header = v
                break
        calls.append(
            {
                "has_payment": has_payment,
                "payment_header": payment_header,
                "url": str(request.url),
                "body": request.content,
            }
        )
        if not has_payment:
            return httpx.Response(
                402,
                json={},
                headers={"X-Payment-Required": _b64(_fake_challenge())},
            )
        return httpx.Response(
            200,
            json=_fake_completion(),
            headers={
                "X-Nexus-Receipt": _b64(_fake_receipt(agent.pubkey)),
                "X-Payment-Response": _b64(_fake_payment_response()),
            },
        )

    respx.post("https://nx.example/api/v1/chat/completions").mock(
        side_effect=_handler
    )

    result = await agent.pay_and_infer(
        "https://nx.example/api/v1",
        model="openai/gpt-4o-mini",
        messages=[{"role": "user", "content": "ping"}],
        network="solana:mainnet",
    )

    assert isinstance(result, X402Result)
    # Probe must come first without X-Payment, then paid retry with it.
    assert len(calls) == 2
    assert calls[0]["has_payment"] is False
    assert calls[1]["has_payment"] is True

    # Both requests carry the same body, same shape.
    body_obj = json.loads(calls[0]["body"])
    assert body_obj["model"] == "openai/gpt-4o-mini"
    assert body_obj["messages"][0]["content"] == "ping"
    assert body_obj["network"] == NETWORK_SOLANA_MAINNET

    # X-Payment header must carry the v2 shape: `accepted` field
    # present, `scheme`/`network` NOT at the top level (that's the v1
    # shape, rejected by @x402/core@2.x with "Cannot read properties
    # of undefined (reading 'scheme')").
    decoded_payment = _decode_b64_json(calls[1]["payment_header"])
    assert decoded_payment is not None
    assert decoded_payment["x402Version"] == 2
    assert "accepted" in decoded_payment
    assert decoded_payment["accepted"]["scheme"] == "exact"
    assert decoded_payment["accepted"]["network"] == NETWORK_SOLANA_MAINNET
    assert decoded_payment["accepted"]["amount"] == "10000"
    assert decoded_payment["accepted"]["payTo"] == FAKE_RECIPIENT
    # `scheme`/`network` MUST NOT appear at the top level.
    assert "scheme" not in decoded_payment
    assert "network" not in decoded_payment
    assert decoded_payment["payload"]["payer"] == agent.pubkey

    # OpenAI body parsed.
    assert result.openai["choices"][0]["message"]["content"] == "pong"
    # Receipt parsed from X-Nexus-Receipt.
    assert result.receipt is not None
    assert result.receipt["v"] == 2
    assert result.receipt["agent_pubkey"] == agent.pubkey
    assert result.receipt["payment"]["tx_signature"] == "MOCK_TX_SIGNATURE"
    # Payment response parsed from X-Payment-Response.
    assert result.payment_response is not None
    assert result.payment_response["txSignature"] == "MOCK_TX_SIGNATURE"


@pytest.mark.asyncio
@respx.mock
async def test_pay_and_infer_raises_on_402_after_retry(monkeypatch) -> None:
    agent = X402Agent.generate()

    async def _stub(self, challenge, *, network, rpc_url=None, client=None):
        return {
            "x402Version": 2,
            "accepted": challenge["accepts"][0],
            "payload": {"transaction": "fake", "payer": self.pubkey},
        }

    monkeypatch.setattr(X402Agent, "build_payment_payload", _stub)

    def _handler(request: httpx.Request) -> httpx.Response:
        has_payment = "x-payment" in {k.lower() for k in request.headers.keys()}
        if not has_payment:
            return httpx.Response(
                402,
                json={},
                headers={"X-Payment-Required": _b64(_fake_challenge())},
            )
        # Server couldn't settle the payment — return 402 again.
        return httpx.Response(
            402,
            json={"error": "payment_invalid", "detail": "tx not landed"},
        )

    respx.post("https://nx.example/api/v1/chat/completions").mock(
        side_effect=_handler
    )

    with pytest.raises(X402PaymentRequiredError):
        await agent.pay_and_infer(
            "https://nx.example/api/v1",
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "x"}],
        )


@pytest.mark.asyncio
@respx.mock
async def test_pay_and_infer_raises_on_409_replay(monkeypatch) -> None:
    agent = X402Agent.generate()

    async def _stub(self, challenge, *, network, rpc_url=None, client=None):
        return {
            "x402Version": 2,
            "accepted": challenge["accepts"][0],
            "payload": {"transaction": "fake", "payer": self.pubkey},
        }

    monkeypatch.setattr(X402Agent, "build_payment_payload", _stub)

    def _handler(request: httpx.Request) -> httpx.Response:
        has_payment = "x-payment" in {k.lower() for k in request.headers.keys()}
        if not has_payment:
            return httpx.Response(
                402,
                json={},
                headers={"X-Payment-Required": _b64(_fake_challenge())},
            )
        return httpx.Response(409, json={"error": "payment_replay"})

    respx.post("https://nx.example/api/v1/chat/completions").mock(
        side_effect=_handler
    )

    with pytest.raises(X402PaymentReplayError):
        await agent.pay_and_infer(
            "https://nx.example/api/v1",
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "x"}],
        )


@pytest.mark.asyncio
@respx.mock
async def test_pay_and_infer_raises_when_probe_not_402() -> None:
    agent = X402Agent.generate()
    respx.post("https://nx.example/api/v1/chat/completions").mock(
        return_value=httpx.Response(500, text="boom")
    )
    with pytest.raises(X402UpstreamError):
        await agent.pay_and_infer(
            "https://nx.example/api/v1",
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "x"}],
        )


@pytest.mark.asyncio
@respx.mock
async def test_build_payment_payload_constructs_valid_solana_tx() -> None:
    """End-to-end exercise of the Solana SPL transfer construction.

    Stubs only the RPC `getLatestBlockhash` call. The transaction
    bytes that come out must:

      1. Decode as a valid VersionedTransaction.
      2. Have the agent's pubkey as a required signer.
      3. Carry a valid signature from the agent over the message bytes.
      4. Have the v2 PaymentPayload wire shape (no top-level
         scheme/network — see Bug #1 in CHANGELOG.md).
      5. Have the four instructions @x402/svm's verifier expects, in
         the exact order:
           [0] SetComputeUnitLimit (ComputeBudget, discriminator 2)
           [1] SetComputeUnitPrice (ComputeBudget, discriminator 3)
           [2] TransferChecked     (SPL Token)
           [3] Memo                (32 ASCII hex chars)
    """
    from solders.transaction import VersionedTransaction

    agent = X402Agent.generate()

    # Mock a Solana RPC response.
    respx.post("https://api.mainnet-beta.solana.com").mock(
        return_value=httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "context": {"slot": 1},
                    "value": {
                        "blockhash": "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N",
                        "lastValidBlockHeight": 1000,
                    },
                },
            },
        )
    )

    payload = await agent.build_payment_payload(
        _fake_challenge(),  # type: ignore[arg-type]
        network="solana:mainnet",
    )

    # v2 shape: `accepted` carries scheme/network, NOT top-level.
    assert payload["x402Version"] == 2
    assert "accepted" in payload
    assert payload["accepted"]["scheme"] == "exact"
    assert payload["accepted"]["network"] == NETWORK_SOLANA_MAINNET
    assert "scheme" not in payload
    assert "network" not in payload
    assert payload["payload"]["payer"] == agent.pubkey

    tx_bytes = base64.b64decode(payload["payload"]["transaction"])
    tx = VersionedTransaction.from_bytes(tx_bytes)
    msg = tx.message
    # Two required signatures: fee-payer (facilitator) + agent.
    assert msg.header.num_required_signatures == 2
    # The agent must appear in the signer prefix of account_keys.
    signer_pubkeys = {
        str(k) for k in list(msg.account_keys)[: msg.header.num_required_signatures]
    }
    assert agent.pubkey in signer_pubkeys

    # Instruction layout — verifier checks the first two are
    # ComputeBudget calls in this exact order, [2] is TransferChecked,
    # [3] is the random-nonce memo.
    account_keys = list(msg.account_keys)
    ixs = list(msg.instructions)
    assert len(ixs) == 4
    prog = lambda ix: str(account_keys[ix.program_id_index])  # noqa: E731
    assert prog(ixs[0]) == COMPUTE_BUDGET_PROGRAM_ID
    assert prog(ixs[1]) == COMPUTE_BUDGET_PROGRAM_ID
    assert prog(ixs[2]) == SPL_TOKEN_PROGRAM_ID
    assert prog(ixs[3]) == MEMO_PROGRAM_ID
    # Compute-budget discriminators: 2 = SetComputeUnitLimit, 3 = SetComputeUnitPrice.
    assert bytes(ixs[0].data)[0] == 2
    assert bytes(ixs[1].data)[0] == 3
    # Memo data is 32 ASCII hex chars (16 random bytes hex-encoded).
    memo_data = bytes(ixs[3].data)
    assert len(memo_data) == 32
    assert all(c in b"0123456789abcdef" for c in memo_data)


@pytest.mark.asyncio
@respx.mock
async def test_agent_signature_verifies_against_on_wire_message_bytes() -> None:
    """Regression guard for the v0 message wire-format signing bug.

    Solana v0 messages start with a 0x80 version-prefix byte. The
    chain verifies signatures against the WITH-prefix wire bytes.
    `solders' bytes(MessageV0)` may omit the prefix, so signing the
    raw bytes produces SignatureFailure on chain — even though
    structural / shape tests pass.

    This test re-derives the on-wire message bytes from the actual
    serialized transaction (the source of truth the chain uses) and
    verifies the agent's signature against them with PyNaCl
    directly — same library, same algorithm, same bytes the chain
    would check.

    If this test fails, it means we're signing the wrong bytes. The
    smoke test would also fail with "SignatureFailure" against
    devnet/mainnet, which is what the v0.2.2 fix addresses.
    """
    import nacl.signing
    from solders.transaction import VersionedTransaction

    agent = X402Agent.generate()

    respx.post("https://api.mainnet-beta.solana.com").mock(
        return_value=httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "context": {"slot": 1},
                    "value": {
                        "blockhash": "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N",
                        "lastValidBlockHeight": 1000,
                    },
                },
            },
        )
    )

    payload = await agent.build_payment_payload(
        _fake_challenge(),  # type: ignore[arg-type]
        network="solana:mainnet",
    )
    tx_bytes = base64.b64decode(payload["payload"]["transaction"])

    # Solana tx wire format: [compact-u16 sig_count][sig_count * 64-byte sigs][message]
    # For our partial-sign case num_required_signatures == 2 (fee_payer + agent),
    # and the count byte is just 0x02 (< 128 → single byte compact-u16).
    sig_count = tx_bytes[0]
    assert sig_count == 2
    sigs_start = 1
    sigs_end = sigs_start + sig_count * 64
    on_wire_msg_bytes = tx_bytes[sigs_end:]

    # The first byte of the v0 message MUST be 0x80 — this is what the
    # chain uses for sig verification. If solders ever stops including
    # it, this assertion fires (and the next one will too).
    assert on_wire_msg_bytes[0] == 0x80, (
        f"on-wire v0 message missing 0x80 prefix; first byte = "
        f"0x{on_wire_msg_bytes[0]:02x}"
    )

    # Find the agent's signature slot. It's whichever of the two slots
    # corresponds to the agent's pubkey in the message's signer prefix.
    tx = VersionedTransaction.from_bytes(tx_bytes)
    msg = tx.message
    signer_keys = list(msg.account_keys)[: msg.header.num_required_signatures]
    agent_slot = next(
        i for i, k in enumerate(signer_keys) if str(k) == agent.pubkey
    )
    agent_sig_bytes = tx_bytes[sigs_start + agent_slot * 64 : sigs_start + (agent_slot + 1) * 64]
    # Default signatures are 64 zero bytes — we want the real agent sig.
    assert agent_sig_bytes != b"\x00" * 64

    # Verify the agent's signature against the on-wire message bytes
    # using the same Ed25519 primitive the chain uses (PyNaCl wraps
    # libsodium; Solana validators wrap ed25519-dalek; same algorithm).
    agent_pub_bytes = base58.b58decode(agent.pubkey)
    verify_key = nacl.signing.VerifyKey(agent_pub_bytes)
    # If this raises BadSignatureError, the on-chain verifier will too.
    verify_key.verify(on_wire_msg_bytes, agent_sig_bytes)
