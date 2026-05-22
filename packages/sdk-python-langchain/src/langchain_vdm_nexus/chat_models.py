"""`ChatNexus` — LangChain `BaseChatModel` backed by the VDM Nexus
x402-gated `/chat/completions` endpoint.

The class owns an `X402Agent` (Ed25519 + Solana keypair) and runs the
two-roundtrip handshake transparently on each `invoke` / `ainvoke`.
The OpenAI chat-completion response is converted to a LangChain
`ChatResult`; the Signed Inference Receipt (SIR v2) and the x402
payment response are exposed via `response_metadata["nexus_receipt"]`
and `response_metadata["nexus_payment"]` respectively.

Streaming (`_stream` / `_astream`) is NOT implemented in v0.1.0 — the
upstream `/chat/completions` endpoint does not emit SSE chunks yet.
Callers using LangChain's streaming APIs will fall through to the
default `BaseChatModel._stream` behaviour, which calls `_generate` and
yields the full result as a single chunk.
"""

from __future__ import annotations

import asyncio
from typing import Any, Optional

from langchain_core.callbacks import (
    AsyncCallbackManagerForLLMRun,
    CallbackManagerForLLMRun,
)
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import ConfigDict, Field

from vdm_nexus import X402Agent


def _convert_messages(messages: list[BaseMessage]) -> list[dict[str, Any]]:
    """Convert LangChain `BaseMessage`s to OpenAI chat-completion shape.

    Mirrors the conversion in `langchain-openai`. Only handles the
    role + content path that the Nexus `/chat/completions` route
    supports today; tool / function-call messages are pass-through
    via the role + content fields and the upstream model handles
    semantics.
    """
    out: list[dict[str, Any]] = []
    for m in messages:
        # Coerce content to str — LangChain allows list-of-parts for
        # multimodal, but the Nexus rail only routes text today.
        content = m.content if isinstance(m.content, str) else str(m.content)
        if isinstance(m, SystemMessage):
            out.append({"role": "system", "content": content})
        elif isinstance(m, HumanMessage):
            out.append({"role": "user", "content": content})
        elif isinstance(m, AIMessage):
            out.append({"role": "assistant", "content": content})
        else:
            # Fall back to the message's `type` attribute (LangChain
            # uses "system" / "human" / "ai" / "tool" / "function").
            # Map to OpenAI roles where possible.
            role = getattr(m, "type", "user")
            if role == "human":
                role = "user"
            elif role == "ai":
                role = "assistant"
            out.append({"role": role, "content": content})
    return out


class ChatNexus(BaseChatModel):
    """LangChain ChatModel for VDM Nexus.

    Pay-per-call inference settled on Solana. Each invocation runs the
    full x402 v2 handshake: probe → 402 → sign SPL transfer → paid
    retry → OpenAI body + signed receipt.

    Example:

        ```python
        from langchain_vdm_nexus import ChatNexus
        from langchain_core.messages import HumanMessage

        llm = ChatNexus(
            secret_key="<base58 Ed25519 64-byte secret>",
            endpoint="https://nexus.vdmnexus.com/api/v1",
            model="openai/gpt-4o-mini",
        )
        reply = llm.invoke([HumanMessage(content="Why Ed25519?")])
        print(reply.content)
        print(reply.response_metadata["nexus_receipt"])
        ```
    """

    secret_key: Optional[str] = Field(
        default=None,
        description=(
            "Base58-encoded 64-byte Ed25519 secret key. Required unless "
            "`agent` is provided. Treat as a password — never log or commit."
        ),
    )
    agent: Optional[X402Agent] = Field(
        default=None,
        description=(
            "Pre-constructed `X402Agent`. Alternative to `secret_key` for "
            "callers who already own a keypair lifecycle."
        ),
    )
    endpoint: str = Field(
        default="https://nexus.vdmnexus.com/api/v1",
        description="Base URL up to /api/v1 (no trailing slash needed).",
    )
    model: str = Field(
        default="openai/gpt-4o-mini",
        description="OpenRouter model slug.",
    )
    network: str = Field(
        default="solana:mainnet",
        description=(
            "CAIP-2 network identifier or friendly alias. "
            "Accepted: 'solana:mainnet', 'solana:devnet', 'mainnet', 'devnet'."
        ),
    )
    timeout: float = Field(
        default=60.0,
        description="HTTP request timeout in seconds.",
    )
    rpc_url: Optional[str] = Field(
        default=None,
        description=(
            "Override Solana RPC URL for the blockhash fetch. Defaults to "
            "the public mainnet/devnet endpoint based on `network`."
        ),
    )

    # Pydantic v2 config — allow the `X402Agent` (non-pydantic class) to
    # live on the model without arbitrary_types_allowed errors.
    model_config = ConfigDict(arbitrary_types_allowed=True)

    @property
    def _llm_type(self) -> str:
        return "vdm-nexus"

    def _get_agent(self) -> X402Agent:
        if self.agent is not None:
            return self.agent
        if not self.secret_key:
            raise ValueError(
                "ChatNexus requires either `secret_key` (base58 64-byte "
                "Ed25519 secret) or a pre-constructed `agent`."
            )
        # Cache the constructed agent on first use so each invocation
        # doesn't pay the keypair-decode cost.
        agent = X402Agent.from_base58(self.secret_key)
        object.__setattr__(self, "agent", agent)
        return agent

    async def _ainvoke_handshake(self, messages: list[BaseMessage]) -> ChatResult:
        agent = self._get_agent()
        oai_messages = _convert_messages(messages)
        result = await agent.pay_and_infer(
            self.endpoint,
            model=self.model,
            messages=oai_messages,
            network=self.network,
            timeout=self.timeout,
            rpc_url=self.rpc_url,
        )

        # OpenAI shape: choices[0].message.content
        choices = result.openai.get("choices") or []
        if not choices:
            raise RuntimeError("Nexus returned empty choices array")
        msg = choices[0].get("message") or {}
        content = msg.get("content") or ""
        finish_reason = choices[0].get("finish_reason")
        usage = result.openai.get("usage") or {}

        ai_msg = AIMessage(
            content=content,
            response_metadata={
                "model_name": result.openai.get("model") or self.model,
                "finish_reason": finish_reason,
                "token_usage": usage,
                "nexus_receipt": result.receipt,
                "nexus_payment": result.payment_response,
            },
            usage_metadata={
                "input_tokens": int(usage.get("prompt_tokens") or 0),
                "output_tokens": int(usage.get("completion_tokens") or 0),
                "total_tokens": int(usage.get("total_tokens") or 0),
            }
            if usage
            else None,
        )
        generation = ChatGeneration(
            message=ai_msg,
            generation_info={
                "finish_reason": finish_reason,
                "nexus_receipt": result.receipt,
                "nexus_payment": result.payment_response,
            },
        )
        return ChatResult(
            generations=[generation],
            llm_output={
                "model_name": result.openai.get("model") or self.model,
                "token_usage": usage,
                "nexus_receipt": result.receipt,
                "nexus_payment": result.payment_response,
            },
        )

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # The x402 handshake is async-only. We bridge to sync by spinning
        # up a fresh event loop when none is running, or by running the
        # coroutine via `asyncio.run`. This mirrors how `langchain-openai`
        # falls back to `asyncio` for its v1 client.
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(self._ainvoke_handshake(messages))
        # If a loop IS already running (e.g. the user called `invoke`
        # from inside an async function), we run on a dedicated thread
        # to avoid `RuntimeError: This event loop is already running`.
        import threading

        result_holder: dict[str, Any] = {}

        def _runner() -> None:
            try:
                result_holder["v"] = asyncio.run(
                    self._ainvoke_handshake(messages)
                )
            except Exception as e:  # noqa: BLE001 — re-raised below
                result_holder["e"] = e

        t = threading.Thread(target=_runner)
        t.start()
        t.join()
        if "e" in result_holder:
            raise result_holder["e"]
        return result_holder["v"]

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        return await self._ainvoke_handshake(messages)
