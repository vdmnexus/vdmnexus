# PR title

Add VDM Nexus action provider (signed inference via x402 on Solana + Base)

# PR body

This PR adds `@coinbase/agentkit-vdm-nexus`, an action provider that
exposes [VDM Nexus](https://vdmnexus.com) as a tool surface inside any
AgentKit-built agent. Three actions: `nexus_chat` (paid inference via
x402 on Solana or Base, returns an OpenAI chat completion plus a Signed
Inference Receipt), `nexus_verify_receipt` (runs the five-check SIR v2
verifier), and `nexus_get_deposit_address` (looks up the USDC deposit
address for prepaid credit top-ups). The wallet attached to AgentKit is
the agent identity — its keypair signs the SPL USDC transfer carried in
the x402 `X-Payment` header — so no separate agent secret env var is
required. The provider is bound to `SvmWalletProvider`; Solana mainnet,
Solana devnet, Base mainnet, and Base Sepolia are all selectable
per-call via the `network` argument on `nexus_chat`.

The package wraps `@vdm-nexus/x402` (Apache-licensed source mirror of
the public npm package), which implements the x402 v2 client-side
handshake using `@x402/core` + `@x402/svm` and the SIR v2 verification
routine. A live mainnet receipt rendered by the same verifier code path
this PR ships is at <https://vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e>
— click "Verify" on that page to see the five-check breakdown
(prompt_hash, response_hash, nexus_signature, payment_on_chain,
payer_matches) render against a real Solana mainnet settlement tx. The
SIR v2 spec is published at <https://docs.vdmnexus.com/docs/spec/sir-v2>.

The diff is self-contained inside `typescript/framework-extensions/vdm-nexus/`
and adds no new top-level dependencies to `@coinbase/agentkit` core —
`@vdm-nexus/x402` lives entirely inside the new package. Tests are not
included in this initial PR (mirroring the convention used by the initial
`erc8004` provider PR); we'll follow up with a mock-based test file in a
second PR once maintainers have eyes on the API shape. Happy to rework
any of this — the action-provider names, the `supportsNetwork` semantics,
and the choice of standalone-package vs. inline action-provider folder
are all easy to revise.
