"""Python SDK for VDM Nexus.

Mirrors the TypeScript `@vdm-nexus/sdk` and `@vdm-nexus/x402` packages.

  - `Agent`       — prepaid signed-inference path against `/v1/inference`.
                    Same wire format as @vdm-nexus/sdk.
  - `X402Agent`   — pay-per-call inference against `/v1/chat/completions`
                    via the x402 v2 handshake. Same wire format as
                    @vdm-nexus/x402.

v0.2.0 adds `X402Agent`. v0.3 will add `verify_receipt` (the five-check
verifier). Wallet operations live in a separate `vdm-nexus-wallet`
package (deferred — see CLAUDE.md "NOT built").
"""

from .agent import (
    Agent,
    GrantResponse,
    InferenceResponse,
    Receipt,
    TaskType,
)
from .sign import sign_body
from .x402 import (
    NETWORK_BASE_MAINNET,
    NETWORK_BASE_SEPOLIA,
    NETWORK_SOLANA_DEVNET,
    NETWORK_SOLANA_MAINNET,
    PaymentPayload,
    PaymentRequired,
    PaymentRequirements,
    X402Agent,
    X402Error,
    X402PaymentRequiredError,
    X402PaymentReplayError,
    X402Result,
    X402UpstreamError,
    resolve_network,
)

__all__ = [
    "Agent",
    "GrantResponse",
    "InferenceResponse",
    "NETWORK_BASE_MAINNET",
    "NETWORK_BASE_SEPOLIA",
    "NETWORK_SOLANA_DEVNET",
    "NETWORK_SOLANA_MAINNET",
    "PaymentPayload",
    "PaymentRequired",
    "PaymentRequirements",
    "Receipt",
    "TaskType",
    "X402Agent",
    "X402Error",
    "X402PaymentRequiredError",
    "X402PaymentReplayError",
    "X402Result",
    "X402UpstreamError",
    "resolve_network",
    "sign_body",
]

__version__ = "0.2.0"
