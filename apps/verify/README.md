# `verify` — Nexus Verify

Hosted, stateless wrapper around `verifyReceipt()` from
[`@vdm-nexus/x402`](../../packages/x402). Deployed at
`https://verify.vdmnexus.com`.

A Nexus receipt is fully self-verifying — anyone holding the SDK can
re-check the five integrity properties locally. This service exists for
integrators who'd rather POST a JSON blob and get back a signed verdict
than embed `tweetnacl`, `bs58`, and a Solana RPC client in their stack.

## Endpoints

### `POST /api/verify`

```json
{
  "receipt": { ... },           // NexusReceipt
  "prompt":  [{ "role": "user", "content": "..." }],
  "response": { ... },          // OpenAI chat-completion object
  "endpoint": "https://nexus.vdmnexus.com",  // optional
  "operatorKey": "<base58>",                  // optional
  "rpc": "https://api.devnet.solana.com"      // optional
}
```

Returns:

```json
{
  "v": 1,
  "ok": true,
  "checks": {
    "prompt_hash_ok": true,
    "response_hash_ok": true,
    "nexus_signature_ok": true,
    "payment_on_chain_ok": true,
    "payer_matches": true
  },
  "receipt_signature": "<base58>",
  "verified_at": 1716200000000,
  "verifier_pubkey": "<base58>",
  "verifier_signature": "<base58>"
}
```

The `verifier_signature` is Ed25519, base58, by the Verify operator key
over the canonical JSON of every field except `verifier_signature`
itself. Including `receipt_signature` in the signed payload binds the
verdict to the specific receipt being verified.

### `GET /api/verify/operator-key`

```json
{ "pubkey": "<base58>", "algorithm": "ed25519", "encoding": "base58" }
```

Pin this in downstream consumers to re-verify Nexus Verify responses
without round-tripping back to this service.

## Dev

```bash
pnpm install                              # at repo root
pnpm --filter verify generate-key         # prints a fresh keypair
# put the printed secret in apps/verify/.env.local
pnpm --filter verify dev                  # http://localhost:3003
```

Smoke test:

```bash
curl http://localhost:3003/api/verify/operator-key
```

## Deploy

1. Create a Vercel project pointing at `apps/verify` as Root Directory.
2. Add `verify.vdmnexus.com` as a domain.
3. Add `NEXUS_VERIFY_OPERATOR_SECRET_KEY` to production + preview env
   (generate via `pnpm --filter verify generate-key`).
4. Optionally set `NEXUS_DEFAULT_ENDPOINT` if you want the default
   `endpoint` parameter to point somewhere other than
   `https://nexus.vdmnexus.com`.
5. Connect GitHub for auto-deploy.

## What this service deliberately doesn't do

- No auth, no API keys, no rate limiting in v0.1. Add when abuse appears.
- No persistence — every request is independent.
- No bulk verification endpoint — one receipt per call.

The local `verifyReceipt()` function from `@vdm-nexus/x402` remains the
trust-minimized path. This service is a convenience.
