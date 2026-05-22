"""Deterministic demo of `ChatNexus` inside a LangGraph node.

Used by `langchain-chat-nexus.tape`. The real `ChatNexus` class, the
real `BaseChatModel` invocation path, and a real LangGraph node all
execute — only `X402Agent.pay_and_infer` is patched to return a
canned `X402Result`, so the render is reproducible offline and never
costs USDC.

The output proves the load-bearing claim: every `ChatNexus` reply
carries the Signed Inference Receipt (SIR v2) on
`response.response_metadata["nexus_receipt"]`, even when the model is
called from inside a LangGraph node.
"""

from __future__ import annotations

import time
from hashlib import sha256
from typing import TypedDict

import base58
from langchain_core.messages import AIMessage, HumanMessage

from vdm_nexus.x402 import X402Result
from langchain_vdm_nexus import ChatNexus

PROMPT = "What is signed inference, in one sentence?"
REPLY = (
    "Signed inference is an LLM call paired with an on-chain payment "
    "and a cryptographic receipt the caller can verify independently."
)

# Stable canned result so the receipt hashes are deterministic.
_TX_SIG = (
    base58.b58encode(b"langgraph_demo_signature_pad___").decode() + "Demo"
)[:88]


def _make_canned_result(agent_pubkey: str) -> X402Result:
    return X402Result(
        openai={
            "id": "chatcmpl-demo-langgraph",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "openai/gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": REPLY},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 18,
                "completion_tokens": 32,
                "total_tokens": 50,
            },
        },
        receipt={
            "v": 2,
            "agent_pubkey": agent_pubkey,
            "provider": "openrouter",
            "model": "openai/gpt-4o-mini",
            "cost_usdc": 0.01,
            "balance_remaining": 0.0,
            "prompt_hash": sha256(PROMPT.encode()).hexdigest(),
            "response_hash": sha256(REPLY.encode()).hexdigest(),
            "timestamp": int(time.time() * 1000),
            "inference_id": "demo-inf-langgraph",
            "payment": {
                "network": "solana:devnet",
                "tx_signature": _TX_SIG,
                "pay_to": "DemoR3c1pi3nt7uK3JTW2gPnv4Qzbo3jHwjCnHd8YJX",
            },
            "nexus_signature": "demo_signature_present_on_server_side_only",
        },
        payment_response={
            "status": "settled",
            "txSignature": _TX_SIG,
            "network": "solana:devnet",
        },
    )


# ---- LangGraph node ---------------------------------------------------

class State(TypedDict):
    messages: list
    receipt: dict | None


def main() -> None:
    from vdm_nexus import X402Agent

    # Real agent, real ChatNexus instance.
    agent = X402Agent.generate()
    llm = ChatNexus(
        agent=agent,
        endpoint="https://nexus.vdmnexus.com/api/v1",
        model="openai/gpt-4o-mini",
        network="solana:devnet",
    )

    # Patch only the network roundtrip.
    canned = _make_canned_result(agent.pubkey)

    async def _stub(*_args, **_kwargs):
        return canned

    agent.pay_and_infer = _stub  # type: ignore[assignment]

    # Build a minimal LangGraph using the langgraph package if available,
    # otherwise demonstrate the same call shape with a manual node fn.
    try:
        from langgraph.graph import StateGraph, END

        def call_model(state: State) -> State:
            reply = llm.invoke(state["messages"])
            return {
                "messages": state["messages"] + [reply],
                "receipt": reply.response_metadata.get("nexus_receipt"),
            }

        graph = StateGraph(State)
        graph.add_node("model", call_model)
        graph.set_entry_point("model")
        graph.add_edge("model", END)
        app = graph.compile()

        print("--- LangGraph node: model ---")
        out = app.invoke({"messages": [HumanMessage(content=PROMPT)], "receipt": None})
        used_langgraph = True
    except ImportError:
        # Fall back: a bare ChatNexus.invoke call. Same surface, no graph.
        print("(langgraph not installed; demonstrating bare ChatNexus.invoke)")
        reply = llm.invoke([HumanMessage(content=PROMPT)])
        out = {"messages": [HumanMessage(content=PROMPT), reply], "receipt": reply.response_metadata.get("nexus_receipt")}
        used_langgraph = False

    # Pretty-print the AIMessage and its attached receipt.
    final = out["messages"][-1]
    assert isinstance(final, AIMessage)
    print()
    print("agent pubkey:    ", agent.pubkey)
    print("endpoint:        https://nexus.vdmnexus.com/api/v1")
    print("network:         solana:devnet  (mocked)")
    print()
    print("--- AIMessage ---")
    print(final.content)
    print()
    print("--- response_metadata['nexus_receipt'] ---")
    receipt = out["receipt"]
    assert receipt is not None
    for k in ("v", "agent_pubkey", "model", "cost_usdc", "prompt_hash", "response_hash"):
        print(f"  {k}: {receipt[k]}")
    print(f"  payment.tx_signature: {receipt['payment']['tx_signature']}")
    print()
    print(f"tx: https://solscan.io/tx/{receipt['payment']['tx_signature']}?cluster=devnet")
    if used_langgraph:
        print()
        print("(receipt landed on the AIMessage inside a real LangGraph node.)")


if __name__ == "__main__":
    main()
