"""LangChain integration for VDM Nexus.

Drop-in `ChatNexus` model — subclass of `BaseChatModel` that speaks the
x402 v2 protocol against `/v1/chat/completions`. Because every other
LangChain abstraction (LangGraph nodes, CrewAI agents, etc.) is built
on `BaseChatModel`, this single class unlocks Nexus across the Python
agent-framework ecosystem.
"""

from .chat_models import ChatNexus

__all__ = ["ChatNexus"]

__version__ = "0.1.0"
