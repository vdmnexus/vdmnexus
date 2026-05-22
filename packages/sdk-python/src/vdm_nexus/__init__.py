"""Python SDK for VDM Nexus.

Mirrors the TypeScript `@vdm-nexus/sdk` package. v0.1.0 ships the Agent
class only — x402 client lands in v0.2, verify_receipt in v0.3, wallet
operations in a separate package.
"""

from .agent import (
    Agent,
    GrantResponse,
    InferenceResponse,
    Receipt,
    TaskType,
)
from .sign import sign_body

__all__ = [
    "Agent",
    "GrantResponse",
    "InferenceResponse",
    "Receipt",
    "TaskType",
    "sign_body",
]

__version__ = "0.1.0"
