"""Ed25519 signing primitives.

The on-the-wire contract: the server verifies the signature against the
EXACT bytes of the JSON request body it received. This module exposes the
raw signing function so callers can sign the same bytes they put on the
wire — no double-serialization.
"""

from __future__ import annotations

import base58
from nacl.signing import SigningKey


def sign_body(secret_key: bytes, body: bytes) -> str:
    """Sign the raw body bytes with the 64-byte Ed25519 secret key.

    Args:
        secret_key: 64-byte tweetnacl-style secret key (seed || public key).
        body: The exact bytes the HTTP client will send as the request body.

    Returns:
        Base58-encoded 64-byte detached signature.
    """
    if len(secret_key) != 64:
        raise ValueError("secret_key must be 64 bytes (Ed25519 seed + public key)")
    seed = secret_key[:32]
    signing_key = SigningKey(seed)
    signature = signing_key.sign(body).signature
    return base58.b58encode(signature).decode("ascii")
