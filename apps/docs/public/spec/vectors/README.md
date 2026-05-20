# SIR v2 Test Vectors

Reference data for implementers of the [Signed Inference Receipt (SIR)
specification, wire format version 2](https://docs.vdmnexus.com/docs/spec/sir-v2).

Three vectors, each in its own directory:

| Vector         | Variant  | What it tests                                                          |
| -------------- | -------- | ---------------------------------------------------------------------- |
| `prepaid-001`  | Prepaid  | Happy path. All five verifier checks pass.                             |
| `x402-001`     | x402     | Happy path for hashes + signature. On-chain checks are offline-skipped (the tx_signature is synthetic). |
| `negative-001` | x402     | Tampered: `response_hash` was flipped after signing. MUST be rejected. |

## Per-vector files

Each directory contains:

- `request.json` — the request the operator received. For prepaid this is the body posted to `/v1/inference`; for x402 this is the OpenAI-shape `{model, messages}` body.
- `response.json` — what the operator returned. For prepaid this is `{result: "..."}`; for x402 this is a full OpenAI chat-completion body.
- `receipt.json` — the signed receipt. The operator built it, canonicalized it (sorted keys, no whitespace, excluding `nexus_signature`), signed the canonical bytes with their Ed25519 secret key, and attached the base58-encoded signature.
- `operator-pubkey.txt` — base58-encoded Ed25519 public key the implementer should use to verify `nexus_signature`. In real deployments this would be fetched from the operator's `/api/v1/operator-key` endpoint; bundled here for self-contained verification.
- `expected.json` — recomputed hashes plus the five verifier checks any conformant implementation MUST produce. On-chain checks for `x402-001` and `negative-001` are marked `"skip-offline"` — implementers in offline mode SHOULD report `payment_on_chain_ok=false` and `payer_matches=false` for those, since the synthetic `tx_signature` will not resolve on any network.

## Verifying these vectors

Implementers do NOT need the operator's private key to verify. Each
vector ships everything required:

- the receipt itself (`receipt.json`)
- the operator's public key (`operator-pubkey.txt`)
- the original request + response so prompt/response hashes can be
  recomputed and compared

The committed receipts were signed by a one-off Ed25519 keypair
generated locally. Its private key is **not** committed (the
`.gitignore` in this directory excludes `operator-keypair.json`) — it
exists only on the machine that produced the receipts. The bundled
public key is the only piece needed to verify.

## Regenerating

```sh
node generate.mjs
```

The script writes `operator-keypair.json` (public + private key) on first
run. The file is gitignored — it stays on your local machine. Subsequent
runs reuse it, so regeneration is byte-stable against the same operator
pubkey as long as you don't delete it. Delete it to rotate.

Regenerating produces new signed receipts with a different operator
pubkey. Commit them only as a coordinated update (the spec page's
appendix and any external references should point to the same set).

## Vector operator pubkey

The pubkey embedded in all three vectors is unique to the machine that
generated them. Implementers verifying these vectors against their own
decoder MUST use the pubkey in each vector's `operator-pubkey.txt`,
**not** the production Nexus operator key (which signs real receipts on
`nexus.vdmnexus.com`).
