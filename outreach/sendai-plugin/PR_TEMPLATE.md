# PR title

feat(plugin-vdm-nexus): signed inference via x402 on Solana + Base

# PR body

This PR adds `@solana-agent-kit/plugin-vdm-nexus`, a plugin that
exposes [VDM Nexus](https://vdmnexus.com) as a tool surface inside any
SendAI-built agent. Three actions: `NEXUS_CHAT` (paid inference via
x402 on Solana or Base, returns an OpenAI chat completion plus a Signed
Inference Receipt), `NEXUS_VERIFY_RECEIPT` (runs the five-check SIR v2
verifier), and `NEXUS_GET_DEPOSIT_ADDRESS` (looks up the USDC deposit
address for prepaid credit top-ups). The same three actions are also
exposed on the agent's `methods` registry as `nexusChat`,
`nexusVerifyReceipt`, and `nexusGetDepositAddress` for direct
programmatic use.

The plugin wraps `@vdm-nexus/x402` (MIT-licensed, published on npm),
which implements the x402 v2 client-side handshake using `@x402/core` +
`@x402/svm` and the SIR v2 verification routine. A live mainnet receipt
rendered by the same verifier code path this PR ships is at
<https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e> — click
"Verify" on that page to see the five-check breakdown (prompt_hash,
response_hash, nexus_signature, payment_on_chain, payer_matches) render
against a real Solana mainnet settlement tx. The SIR v2 spec is
published at <https://docs.vdmnexus.com/docs/spec/sir-v2>.

The diff is self-contained inside `packages/plugin-vdm-nexus/` and adds
no new top-level dependencies to `solana-agent-kit` core —
`@vdm-nexus/x402` lives entirely inside the new plugin. Apache-2.0
licensed to match the rest of the tree.

## A note on `signerSecretKey`

The plugin's `configure()` helper takes a `signerSecretKey` config
field, used by `NEXUS_CHAT` to sign the SPL USDC transfer carried in
the x402 `X-Payment` header. This is separate from the
`SolanaAgentKit` wallet because the `BaseWallet` interface
intentionally hides raw secret-key bytes (so hardware/browser wallets
can plug into the same interface), and x402 SVM settlement needs raw
bytes today. The plugin asserts that the `signerSecretKey`'s pubkey
matches `agent.wallet.publicKey` at handler time and returns a clear
`wallet_signer_mismatch` error if they diverge — so the on-chain
payment can't accidentally land from a wallet the SendAI agent doesn't
think it owns. The other two actions don't need a secret and work
without it.

Hardware-wallet support is a follow-up — it requires an upstream
change in `@x402/svm` to accept a non-keypair signer. Happy to file
that PR against `coinbase/x402` once the API shape lands here.

## Tests + follow-ups

Tests are not included in this initial PR (mirroring the convention
used by the initial `plugin-defi` PR); I'll follow up with a
mock-based test file in a second PR once maintainers have eyes on the
API shape.

Happy to rework any of this — the action names (NEXUS_CHAT vs.
NEXUS_CHAT_COMPLETION etc.), the `methods` surface, the choice of
sub-export path for the LangChain/Vercel AI SDK helpers
(`/tools` vs. inline), the `configure()` helper vs. a factory function
— are all easy to revise.
