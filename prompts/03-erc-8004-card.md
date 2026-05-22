# Prompt 03 — ERC-8004 agent card

**Roadmap item:** Phase 1 — Distribution, #3.
**Branch:** `claude/erc-8004-card`.
**Outcome:** Hosted agent card + on-chain identity NFT minted.

---

## Pre-session checklist

1. Read `STATUS.md`. Add a row:
   `| claude/erc-8004-card | ERC-8004 identity registration | <today> | in_progress | — |`
2. Read `CLAUDE.md` for current endpoint inventory and the deposit
   addresses on Solana + Base.

## Prompt body

Goal: publish an ERC-8004 agent card for VDM Nexus. ERC-8004
("Trustless Agents") went live on Ethereum mainnet 29 Jan 2026;
co-authored by Coinbase / MetaMask / Ethereum Foundation / Google.
Defines three on-chain registries: Identity, Reputation, Validation.
We want Identity registration only.

### Tasks

1. Read the ERC-8004 spec (`eips.ethereum.org/EIPS/eip-8004`). Confirm:
   - Canonical Identity registry contract address on Ethereum mainnet.
   - Exact JSON schema for an agent card.
   - Whether the card is hosted off-chain (likely yes) with an
     on-chain pointer.
2. Write the agent card JSON. Required fields per spec, plus:
   - Domain: `vdmnexus.com`
   - Endpoints: `/chat/completions` (x402 v2, OpenAI-shape),
     `/v1/inference` (Ed25519-signed prepaid),
     `/api/v1/operator-key`
   - Payment addresses: `NEXUS_DEPOSIT_ADDRESS` (Solana mainnet) +
     `BASE_DEPOSIT_ADDRESS` (Base mainnet)
   - Verification method: SIR v2; link `docs.vdmnexus.com/spec/sir-v2`
   - Capabilities: chat completion, signed inference, MCP server
3. Host at `vdmnexus.com/.well-known/agent-card.json` (or wherever the
   spec mandates — verify).
4. Mint the on-chain Identity NFT on Ethereum mainnet, pointing at the
   hosted URL. Use a throwaway address with ~$10 ETH for gas. If
   ERC-8004 supports Base, mint there too (cheaper).
5. Docs page at `docs.vdmnexus.com/erc-8004` explaining what we
   registered and how to verify.
6. Footer link in `apps/web` to `/.well-known/agent-card.json`.

### Out of scope

- Reputation submissions
- Validation proofs
- Anything beyond Identity registration

### Deliverables

- `apps/web/public/.well-known/agent-card.json`
- `apps/docs/.../erc-8004.mdx`
- Etherscan link to the mint tx (paste in commit message AND PR body)
- Footer link in `apps/web`

## Done criteria

1. PR open against `main` from `claude/erc-8004-card`.
2. CI green.
3. On-chain mint tx referenced in PR description with Etherscan link.
4. `STATUS.md` row updated to `in_review`.
5. Build_log entry: *"ERC-8004 agent card live at
   vdmnexus.com/.well-known/agent-card.json. Identity NFT minted on
   Ethereum mainnet → <etherscan-url>. SIR v2 verification method
   declared."* Tags: `['identity', 'erc-8004', 'distribution']`.
6. Subscribe to PR activity.
