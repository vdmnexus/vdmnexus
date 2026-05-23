"""Python port of @vdm-nexus/sdk's Agent class."""

from __future__ import annotations

import json
import time
import uuid
from typing import Any, Literal, Optional, TypedDict

import base58
import httpx
from nacl.signing import SigningKey

from .sign import sign_body as _sign

TaskType = Literal["fast", "reasoning", "general"]
_DEFAULT_TASK_TYPE: TaskType = "general"


class Payment(TypedDict, total=False):
    scheme: str
    network: str
    pay_to: str
    amount_usdc: float
    tx_signature: str


class Receipt(TypedDict, total=False):
    # SIR v2 fields — `v`, `nexus_signature`, and (for x402 receipts)
    # `payment` were missing before 2026-05-23. They've always been on
    # the wire; the type just didn't reflect them. See the SIR v2 spec
    # at docs.vdmnexus.com/docs/spec/sir-v2 for the canonical shape.
    v: int
    agent_pubkey: str
    provider: str
    upstream: str
    model: str
    cost_usdc: float
    balance_remaining: float
    prompt_hash: str
    response_hash: str
    timestamp: int
    inference_id: Optional[str]
    points_total: int
    payment: Payment
    nexus_signature: str


class InferenceResponse(TypedDict, total=False):
    ok: bool
    result: str
    receipt: Receipt
    error: str
    detail: str


class GrantResponse(TypedDict, total=False):
    ok: bool
    agent_pubkey: str
    grant_usdc: float
    balance_usdc: float
    error: str
    detail: str


class Agent:
    """Autonomous agent identified by an Ed25519 keypair.

    Mirrors `packages/sdk/src/agent.ts`. The Solana-compatible 64-byte
    secret key (seed || public key) is the sole credential — no API keys.
    """

    def __init__(self, secret_key: bytes) -> None:
        if len(secret_key) != 64:
            raise ValueError("secret_key must be 64 bytes (Ed25519 seed + public key)")
        self.secret_key = bytes(secret_key)
        self.public_key = self.secret_key[32:]

    @classmethod
    def generate(cls) -> "Agent":
        sk = SigningKey.generate()
        return cls(bytes(sk) + bytes(sk.verify_key))

    @classmethod
    def from_base58(cls, secret_key_base58: str) -> "Agent":
        return cls(base58.b58decode(secret_key_base58))

    @property
    def pubkey(self) -> str:
        """Base58-encoded public key. This is the agent's identity."""
        return base58.b58encode(self.public_key).decode("ascii")

    @property
    def secret_key_base58(self) -> str:
        """Base58-encoded 64-byte secret key. Treat as a password."""
        return base58.b58encode(self.secret_key).decode("ascii")

    def sign_body(self, body: bytes) -> str:
        """Sign the raw body bytes; returns a base58 signature.

        Pass the EXACT bytes you will send as the HTTP body — the Nexus
        server re-derives the signature against the bytes it receives.
        """
        return _sign(self.secret_key, body)

    async def inference(
        self,
        endpoint: str,
        *,
        prompt: str,
        task_type: TaskType = _DEFAULT_TASK_TYPE,
        max_cost_usdc: Optional[float] = None,
        auto_grant: bool = True,
        client: Optional[httpx.AsyncClient] = None,
    ) -> InferenceResponse:
        """POST a signed inference request to `<endpoint>/inference`.

        On `insufficient_credits`, optionally probes `<endpoint>/grants`
        once and retries. Pass `auto_grant=False` to fail fast instead.
        Pass `client` to reuse an `httpx.AsyncClient` for pooling.
        """
        base = endpoint.rstrip("/")
        opts = {"prompt": prompt, "task_type": task_type, "max_cost_usdc": max_cost_usdc}

        async def go(c: httpx.AsyncClient) -> InferenceResponse:
            first = await self._inference_once(c, base, opts)
            if first.get("ok"):
                return first
            if auto_grant and first.get("error") == "insufficient_credits":
                grant = await self.grant(base, client=c)
                if grant.get("ok"):
                    return await self._inference_once(c, base, opts)
            return first

        if client is not None:
            return await go(client)
        async with httpx.AsyncClient() as owned:
            return await go(owned)

    async def grant(
        self,
        endpoint: str,
        *,
        client: Optional[httpx.AsyncClient] = None,
    ) -> GrantResponse:
        """Request a sponsored USDC grant for this agent's pubkey."""
        url = f"{endpoint.rstrip('/')}/grants"
        body = json.dumps({"agent_pubkey": self.pubkey}, separators=(",", ":")).encode()
        headers = {"Content-Type": "application/json"}
        try:
            if client is not None:
                res = await client.post(url, content=body, headers=headers)
            else:
                async with httpx.AsyncClient() as c:
                    res = await c.post(url, content=body, headers=headers)
            return _parse_json(res)  # type: ignore[return-value]
        except (httpx.HTTPError, ValueError) as e:
            return {"ok": False, "error": "grant_request_failed", "detail": str(e)}

    async def _inference_once(
        self,
        client: httpx.AsyncClient,
        base: str,
        opts: dict[str, Any],
    ) -> InferenceResponse:
        payload: dict[str, Any] = {
            "prompt": opts["prompt"],
            "task_type": opts.get("task_type") or _DEFAULT_TASK_TYPE,
            "nonce": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
        }
        if opts.get("max_cost_usdc") is not None:
            payload["max_cost_usdc"] = opts["max_cost_usdc"]
        # CRITICAL: serialize once. The same bytes get signed AND sent.
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        res = await client.post(
            f"{base}/inference",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Agent-Pubkey": self.pubkey,
                "X-Nexus-Signature": self.sign_body(body),
            },
        )
        return _parse_json(res)  # type: ignore[return-value]


def _parse_json(res: httpx.Response) -> dict[str, Any]:
    try:
        return res.json()
    except ValueError:
        return {
            "ok": False,
            "error": "invalid_response",
            "detail": f"non-JSON response (status {res.status_code})",
        }
