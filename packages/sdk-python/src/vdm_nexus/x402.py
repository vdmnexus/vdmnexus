"""x402 client for the Nexus pay-per-call inference endpoint.

Mirrors `packages/x402/src/x402-agent.ts`. Same probe → 402 → sign → paid
retry handshake. Same canonical JSON for the `PaymentPayload`. Same
header names. The only thing different is the Solana transaction-builder
plumbing — Python uses `solders` where the TS package uses `@x402/svm`.

Wire format (CAIP-2 + x402 v2):

  1. Client POSTs `{ "model": ..., "messages": [...] }` to
     `<endpoint>/chat/completions`.
  2. Server replies 402 with header `X-Payment-Required: <base64 JSON>`
     carrying a `PaymentRequired` body:
         {
             "x402Version": 2,
             "resource": { "url": ..., "description": ..., ... },
             "accepts": [
                 {
                     "scheme": "exact",
                     "network": "solana:mainnet",
                     "asset": "<USDC mint>",
                     "amount": "<atomic, e.g. 10000 = 0.01 USDC>",
                     "payTo": "<recipient base58>",
                     "maxTimeoutSeconds": 60,
                     "extra": { "feePayer": "<facilitator base58>" },
                 },
                 ...
             ]
         }
  3. Client picks the entry matching its desired `network`, builds a
     partially-signed Solana tx containing four instructions in this
     exact order (matches `@x402/svm`'s `ExactSvmScheme.createPaymentPayload`
     and the facilitator's `verifyComputeLimit/PriceInstruction` checks):
         [0] SetComputeUnitLimit  (ComputeBudget program, discriminator 2)
         [1] SetComputeUnitPrice  (ComputeBudget program, discriminator 3)
         [2] TransferChecked      (SPL Token program)
         [3] Memo                 (16 random bytes hex-encoded)
     The agent signs as the source-token authority; the fee payer
     (facilitator) co-signs server-side before broadcasting.
  4. Client re-POSTs the same body with header
         X-Payment: <base64 JSON {x402Version, accepted, resource?, payload}>
     where `payload = { transaction: <base64 tx>, payer: <base58 agent> }`
     and `accepted` is the full matched `PaymentRequirements` entry from
     `challenge.accepts[]`. This is the v2 shape — the v1 shape carried
     `scheme`/`network` at the top level, but `@x402/core@2.x` rejects
     that ("Cannot read properties of undefined (reading 'scheme')").
  5. Server settles via the facilitator, runs inference, and returns:
       - JSON body: OpenAI `chat.completion`
       - Header `X-Nexus-Receipt: <base64 SIR v2>`
       - Header `X-Payment-Response: <base64 {status, txSignature, network}>`

In tests, `build_payment_payload()` is the swap point — mock it to
return a static payload and `pay_and_infer()` will run the full
handshake against an httpx mock without ever touching Solana RPC.
"""

from __future__ import annotations

import base64
import json
import secrets
from dataclasses import dataclass
from typing import Any, Optional, TypedDict

import base58
import httpx

from .agent import Agent

# ----- header constants (must match @vdm-nexus/x402) -------------------

PAYMENT_HEADER = "X-Payment"
PAYMENT_REQUIRED_HEADER = "X-Payment-Required"
PAYMENT_RESPONSE_HEADER = "X-Payment-Response"
RECEIPT_HEADER = "X-Nexus-Receipt"

X402_VERSION = 2

# CAIP-2 network identifiers exposed by the Nexus rail. The TS
# constants in `@vdm-nexus/paywall` are the source of truth — these
# Python copies must stay in sync.
NETWORK_SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
NETWORK_SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
NETWORK_BASE_MAINNET = "eip155:8453"
NETWORK_BASE_SEPOLIA = "eip155:84532"

# Aliases the server's `resolveNetworkInput` accepts. We mirror them
# here so callers can pass the friendly form.
_NETWORK_ALIASES: dict[str, str] = {
    "devnet": NETWORK_SOLANA_DEVNET,
    "solana-devnet": NETWORK_SOLANA_DEVNET,
    "solana:devnet": NETWORK_SOLANA_DEVNET,
    "mainnet": NETWORK_SOLANA_MAINNET,
    "solana-mainnet": NETWORK_SOLANA_MAINNET,
    "solana:mainnet": NETWORK_SOLANA_MAINNET,
    "base": NETWORK_BASE_MAINNET,
    "base-mainnet": NETWORK_BASE_MAINNET,
    "eip155:8453": NETWORK_BASE_MAINNET,
    "base-sepolia": NETWORK_BASE_SEPOLIA,
    "eip155:84532": NETWORK_BASE_SEPOLIA,
}


def resolve_network(name: str) -> str:
    """Resolve a friendly alias to its CAIP-2 form. Pass-through if
    the input is already a CAIP-2 string."""
    return _NETWORK_ALIASES.get(name.strip().lower(), name)


# ----- exception types -------------------------------------------------


class X402Error(Exception):
    """Base x402 exception."""


class X402UpstreamError(X402Error):
    def __init__(self, detail: Optional[str], status: int) -> None:
        super().__init__(f"x402_upstream_error: {detail or 'unknown'}")
        self.detail = detail
        self.status = status


class X402PaymentRequiredError(X402Error):
    def __init__(self, detail: Optional[str], status: int = 402) -> None:
        super().__init__(f"x402_payment_invalid: {detail or 'unknown'}")
        self.detail = detail
        self.status = status


class X402PaymentReplayError(X402Error):
    def __init__(self) -> None:
        super().__init__("x402_payment_replay")


# ----- result types ----------------------------------------------------


class PaymentRequirements(TypedDict, total=False):
    """One entry inside `PaymentRequired.accepts`. Mirrors
    `@x402/core` types — only the fields the client actually needs to
    build a payload are required here. Extra fields are tolerated."""

    scheme: str
    network: str
    asset: str
    amount: str
    payTo: str
    maxTimeoutSeconds: int
    resource: str
    description: str
    mimeType: str
    extra: dict[str, Any]


class PaymentRequired(TypedDict):
    """Server's 402 challenge body."""

    x402Version: int
    accepts: list[PaymentRequirements]


class SolanaPaymentPayloadInner(TypedDict):
    """`payload.payload` for the Solana exact scheme."""

    transaction: str  # base64-encoded partially-signed tx
    payer: str        # base58 of the first signer == the agent


class PaymentPayload(TypedDict, total=False):
    """`X-Payment` header value, JSON-then-base64 encoded on the wire.

    v2 shape (matches `@x402/core@2.x`'s `PaymentPayloadV2Schema`):
      - `x402Version`: literal 2
      - `accepted`: the matched `PaymentRequirements` entry from
        `challenge.accepts[]` (scheme/network/amount/asset/payTo/...)
      - `resource`: optional `ResourceInfo` echoed from the challenge
      - `payload`: scheme-specific (for Solana exact: `{transaction, payer}`)

    The v1 shape carried `scheme`/`network` at the top level. Sending
    the v1 shape against v2 facilitators fails with
    "Cannot read properties of undefined (reading 'scheme')" in
    `@x402/core`'s dispatcher.
    """

    x402Version: int
    accepted: PaymentRequirements
    resource: dict[str, Any]
    payload: dict[str, Any]


@dataclass
class X402Result:
    """Outcome of `X402Agent.pay_and_infer`.

    `openai` is the OpenAI chat-completion body (always present on
    success). `receipt` and `payment_response` are parsed from the
    response headers; they are `None` if the server omitted them
    (shouldn't happen on a successful paid call against the live rail).
    """

    openai: dict[str, Any]
    receipt: Optional[dict[str, Any]]
    payment_response: Optional[dict[str, Any]]


# ----- header codecs ---------------------------------------------------


def _decode_b64_json(value: Optional[str]) -> Optional[dict[str, Any]]:
    if not value:
        return None
    try:
        return json.loads(base64.b64decode(value).decode("utf-8"))
    except (ValueError, json.JSONDecodeError):
        return None


def _encode_b64_json(obj: Any) -> str:
    return base64.b64encode(
        json.dumps(obj, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")


# ----- SPL transfer construction --------------------------------------

# SPL Token program ID (legacy). For Token-2022, the program ID
# differs; Nexus currently uses legacy USDC on both Solana mainnet and
# devnet, so legacy is all we need here.
SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"

# Memo program (used for the random-nonce memo instruction that the
# @x402/svm scheme appends after the transfer).
MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

# Compute-budget defaults. These MUST match `@x402/svm@2.x`'s constants
# (`packages/svm/src/constants.ts`) — the facilitator's verifier checks
# that `instructions[0]` is a SetComputeUnitLimit (discriminator 2)
# and `instructions[1]` is a SetComputeUnitPrice (discriminator 3),
# both on the ComputeBudget program.
DEFAULT_COMPUTE_UNIT_LIMIT = 20_000
DEFAULT_COMPUTE_UNIT_PRICE_MICROLAMPORTS = 1


def _derive_ata(owner_b58: str, mint_b58: str) -> str:
    """Derive the Associated Token Account (ATA) for `owner` + `mint`.

    Mirrors `getAssociatedTokenAddress` from `@solana/spl-token`. The
    address is `findProgramAddress([owner, SPL_TOKEN_PROGRAM, mint],
    ASSOCIATED_TOKEN_PROGRAM_ID)`.
    """
    from solders.pubkey import Pubkey

    owner = Pubkey.from_string(owner_b58)
    mint = Pubkey.from_string(mint_b58)
    spl_token = Pubkey.from_string(SPL_TOKEN_PROGRAM_ID)
    ata_program = Pubkey.from_string(ASSOCIATED_TOKEN_PROGRAM_ID)
    ata, _bump = Pubkey.find_program_address(
        [bytes(owner), bytes(spl_token), bytes(mint)],
        ata_program,
    )
    return str(ata)


def _build_transfer_checked_ix(
    *,
    source_ata: str,
    mint: str,
    dest_ata: str,
    owner: str,
    amount_atomic: int,
    decimals: int,
) -> Any:
    """Build the SPL TransferChecked instruction.

    Layout (discriminator 12):
        [u8 = 12][u64 LE amount][u8 decimals]
    Accounts (in order):
        0. source ATA (writable)
        1. mint (read-only)
        2. dest ATA (writable)
        3. owner of source (signer, read-only)
    """
    from solders.instruction import AccountMeta, Instruction
    from solders.pubkey import Pubkey

    data = bytes([12]) + amount_atomic.to_bytes(8, "little") + bytes([decimals])
    return Instruction(
        program_id=Pubkey.from_string(SPL_TOKEN_PROGRAM_ID),
        accounts=[
            AccountMeta(Pubkey.from_string(source_ata), is_signer=False, is_writable=True),
            AccountMeta(Pubkey.from_string(mint), is_signer=False, is_writable=False),
            AccountMeta(Pubkey.from_string(dest_ata), is_signer=False, is_writable=True),
            AccountMeta(Pubkey.from_string(owner), is_signer=True, is_writable=False),
        ],
        data=data,
    )


async def _get_recent_blockhash(
    client: httpx.AsyncClient, rpc_url: str
) -> Any:
    """Fetch the latest blockhash via Solana JSON-RPC."""
    from solders.hash import Hash

    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getLatestBlockhash",
        "params": [{"commitment": "finalized"}],
    }
    res = await client.post(rpc_url, json=body, timeout=15.0)
    res.raise_for_status()
    blockhash_b58 = res.json()["result"]["value"]["blockhash"]
    return Hash.from_string(blockhash_b58)


# ----- USDC defaults per network --------------------------------------

USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def _default_usdc_for(network: str) -> str:
    if network == NETWORK_SOLANA_MAINNET:
        return USDC_MINT_MAINNET
    return USDC_MINT_DEVNET


def _default_rpc_for(network: str) -> str:
    if network == NETWORK_SOLANA_MAINNET:
        return "https://api.mainnet-beta.solana.com"
    return "https://api.devnet.solana.com"


# ----- the agent class -------------------------------------------------


class X402Agent(Agent):
    """An `Agent` that can pay per-call via x402.

    Inherits the prepaid `Agent.inference()` surface, so callers who
    have a funded credits ledger can still use it. Adds
    `pay_and_infer()` for the x402-gated `/chat/completions` flow:
    builds a signed Solana SPL USDC transfer, sends it as the
    `X-Payment` header, and returns the OpenAI body plus the parsed
    SIR v2 receipt.

    Currently EVM (Base) is NOT supported by `pay_and_infer()` — only
    Solana mainnet and devnet. The TS package supports Base via
    ERC-3009 `transferWithAuthorization`; the Python equivalent
    arrives in v0.3.
    """

    @classmethod
    def generate(cls) -> "X402Agent":  # type: ignore[override]
        base = Agent.generate()
        return cls(base.secret_key)

    @classmethod
    def from_base58(cls, secret_key_base58: str) -> "X402Agent":  # type: ignore[override]
        return cls(base58.b58decode(secret_key_base58))

    async def build_payment_payload(
        self,
        challenge: PaymentRequired,
        *,
        network: str,
        rpc_url: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> PaymentPayload:
        """Build a signed `PaymentPayload` from a 402 challenge.

        This is the unit-testable seam. Tests can monkey-patch this
        to return a static payload and skip Solana RPC entirely; the
        rest of the handshake exercises the wire format end-to-end.

        Args:
            challenge: The decoded `PaymentRequired` from the 402.
            network: The CAIP-2 network the caller wants to settle on
                (must appear in `challenge.accepts`).
            rpc_url: Override Solana RPC URL. Defaults to the public
                mainnet/devnet endpoint based on `network`.
            client: Reuse an `httpx.AsyncClient` for pooling.

        Raises:
            X402Error: if the challenge has no entry for `network`,
                or if the entry is not the `exact` scheme on Solana.
        """
        normalized = resolve_network(network)
        entry: Optional[PaymentRequirements] = None
        for a in challenge.get("accepts", []):
            if a.get("network") == normalized and a.get("scheme") == "exact":
                entry = a
                break
        if entry is None:
            raise X402Error(
                f"challenge has no `exact` entry for network={normalized}"
            )

        if not normalized.startswith("solana:"):
            raise X402Error(
                "Python SDK only supports Solana networks today; "
                f"got {normalized}. Use the TS @vdm-nexus/x402 package for Base."
            )

        pay_to = entry.get("payTo")
        amount = entry.get("amount")
        asset = entry.get("asset") or _default_usdc_for(normalized)
        extra = entry.get("extra") or {}
        fee_payer = extra.get("feePayer") or pay_to
        if not pay_to or not amount:
            raise X402Error("challenge entry missing payTo or amount")

        # USDC has 6 decimals on Solana mainnet and devnet.
        decimals = 6
        amount_atomic = int(amount)

        from solders.compute_budget import (
            set_compute_unit_limit,
            set_compute_unit_price,
        )
        from solders.instruction import Instruction
        from solders.keypair import Keypair
        from solders.message import MessageV0
        from solders.pubkey import Pubkey
        from solders.signature import Signature
        from solders.transaction import VersionedTransaction

        seed = bytes(self.secret_key[:32])
        keypair = Keypair.from_seed(seed)

        source_ata = _derive_ata(self.pubkey, asset)
        dest_ata = _derive_ata(pay_to, asset)

        transfer_ix = _build_transfer_checked_ix(
            source_ata=source_ata,
            mint=asset,
            dest_ata=dest_ata,
            owner=self.pubkey,
            amount_atomic=amount_atomic,
            decimals=decimals,
        )

        # The four instructions, in the exact order @x402/svm assembles
        # them. `@x402/svm` builds the message via `pipe()` that:
        #   1. sets ComputeUnitPrice (becomes the second instruction)
        #   2. sets fee payer
        #   3. PREPENDS SetComputeUnitLimit (so it becomes [0])
        #   4. APPENDS [transferIx, memoIx]
        # The facilitator's verifier asserts [0]=limit, [1]=price,
        # [2]=transfer, and accepts memo/lighthouse in [3..].
        limit_ix = set_compute_unit_limit(DEFAULT_COMPUTE_UNIT_LIMIT)
        price_ix = set_compute_unit_price(
            DEFAULT_COMPUTE_UNIT_PRICE_MICROLAMPORTS
        )
        # Random 16-byte nonce, hex-encoded to 32 ASCII chars. Mirrors
        # `Array.from(nonce).map(b => b.toString(16).padStart(2, "0")).join("")`
        # in `@x402/svm`'s createPaymentPayload.
        nonce_bytes = secrets.token_bytes(16)
        memo_data = nonce_bytes.hex().encode("ascii")
        memo_ix = Instruction(
            program_id=Pubkey.from_string(MEMO_PROGRAM_ID),
            accounts=[],
            data=memo_data,
        )
        instructions = [limit_ix, price_ix, transfer_ix, memo_ix]

        rpc = rpc_url or _default_rpc_for(normalized)

        async def _build_tx(c: httpx.AsyncClient) -> str:
            blockhash = await _get_recent_blockhash(c, rpc)
            msg = MessageV0.try_compile(
                payer=Pubkey.from_string(fee_payer),
                instructions=instructions,
                address_lookup_table_accounts=[],
                recent_blockhash=blockhash,
            )
            # Partial signing: sign as the agent, leave the fee-payer
            # signature blank. The facilitator co-signs as `feePayer`
            # server-side before broadcasting.
            #
            # Account keys appear in this order:
            #   [0] fee_payer (signer)
            #   [1] agent     (signer, our identity)
            #   ... non-signers
            # We populate the signatures array in the same order.
            agent_sig = keypair.sign_message(bytes(msg))
            sigs = []
            for key in list(msg.account_keys)[: msg.header.num_required_signatures]:
                if str(key) == self.pubkey:
                    sigs.append(agent_sig)
                else:
                    sigs.append(Signature.default())
            tx = VersionedTransaction.populate(msg, sigs)
            return base64.b64encode(bytes(tx)).decode("ascii")

        if client is None:
            async with httpx.AsyncClient() as owned:
                tx_b64 = await _build_tx(owned)
        else:
            tx_b64 = await _build_tx(client)

        payload: PaymentPayload = {
            "x402Version": X402_VERSION,
            "accepted": entry,
            "payload": {
                "transaction": tx_b64,
                "payer": self.pubkey,
            },
        }
        # `resource` is optional on the wire (omit when the challenge
        # didn't carry one). When present it's a `ResourceInfo` object.
        resource = challenge.get("resource")
        if resource is not None:
            payload["resource"] = resource
        return payload

    async def pay_and_infer(
        self,
        endpoint: str,
        *,
        model: str,
        messages: list[dict[str, Any]],
        network: str = "solana:mainnet",
        rpc_url: Optional[str] = None,
        timeout: float = 30.0,
        client: Optional[httpx.AsyncClient] = None,
    ) -> X402Result:
        """Run the x402 probe → 402 → sign → paid retry handshake.

        Args:
            endpoint: Base URL (with or without trailing `/api/v1`).
                If the caller already includes `/api/v1`, we append
                `/chat/completions`; otherwise we append the full
                `/api/v1/chat/completions`.
            model: OpenRouter model slug (e.g. `openai/gpt-4o-mini`).
            messages: OpenAI-shape `[{ "role": ..., "content": ... }]`.
            network: CAIP-2 or friendly alias. Default mainnet.
            rpc_url: Override Solana RPC for the blockhash fetch.
            timeout: httpx request timeout, seconds.
            client: Reuse an existing AsyncClient.

        Returns:
            `X402Result(openai, receipt, payment_response)`.

        Raises:
            X402UpstreamError: probe returned non-402, or paid retry
                failed with a non-2xx other than 402/409.
            X402PaymentRequiredError: paid retry returned 402 (server
                couldn't verify or settle the payment).
            X402PaymentReplayError: paid retry returned 409 (the same
                payment was already settled — should never happen on
                a fresh payload).
        """
        base = endpoint.rstrip("/")
        # Allow callers to pass either `https://host/api/v1` (preferred)
        # or `https://host` (we add `/api/v1` for them).
        if base.endswith("/api/v1"):
            url = f"{base}/chat/completions"
        else:
            url = f"{base}/api/v1/chat/completions"

        normalized = resolve_network(network)
        request_body = json.dumps(
            {"model": model, "messages": messages, "network": normalized},
            separators=(",", ":"),
        )

        async def _go(c: httpx.AsyncClient) -> X402Result:
            # 1. Probe.
            probe = await c.post(
                url,
                content=request_body,
                headers={"Content-Type": "application/json"},
                timeout=timeout,
            )
            if probe.status_code != 402:
                text = probe.text
                raise X402UpstreamError(
                    f"expected 402 on probe, got {probe.status_code}: "
                    f"{text[:200]}",
                    probe.status_code,
                )

            challenge = _decode_b64_json(
                probe.headers.get(PAYMENT_REQUIRED_HEADER)
                or probe.headers.get(PAYMENT_REQUIRED_HEADER.lower())
            )
            if challenge is None:
                # Fall back to body-level `challenge` field.
                try:
                    body = probe.json()
                    challenge = body.get("challenge")
                except (ValueError, AttributeError):
                    challenge = None
            if challenge is None:
                raise X402UpstreamError(
                    "402 response had no X-Payment-Required header or "
                    "body challenge",
                    402,
                )

            # 2. Build signed payment.
            payment = await self.build_payment_payload(
                challenge,  # type: ignore[arg-type]
                network=normalized,
                rpc_url=rpc_url,
                client=c,
            )

            # 3. Paid retry.
            paid = await c.post(
                url,
                content=request_body,
                headers={
                    "Content-Type": "application/json",
                    PAYMENT_HEADER: _encode_b64_json(payment),
                },
                timeout=timeout,
            )

            if paid.status_code == 409:
                raise X402PaymentReplayError()
            if paid.status_code == 402:
                detail = None
                try:
                    detail = paid.json().get("detail")
                except (ValueError, AttributeError):
                    pass
                raise X402PaymentRequiredError(detail)
            if paid.status_code >= 400:
                detail = None
                try:
                    detail = paid.json().get("detail")
                except (ValueError, AttributeError):
                    pass
                raise X402UpstreamError(detail, paid.status_code)

            openai_body = paid.json()
            receipt = _decode_b64_json(
                paid.headers.get(RECEIPT_HEADER)
                or paid.headers.get(RECEIPT_HEADER.lower())
            )
            payment_response = _decode_b64_json(
                paid.headers.get(PAYMENT_RESPONSE_HEADER)
                or paid.headers.get(PAYMENT_RESPONSE_HEADER.lower())
            )
            return X402Result(
                openai=openai_body,
                receipt=receipt,
                payment_response=payment_response,
            )

        if client is not None:
            return await _go(client)
        async with httpx.AsyncClient() as owned:
            return await _go(owned)
