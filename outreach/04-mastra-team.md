# Mastra core team

**Why:** Mastra is the most Nexus-shaped TS framework alive — Apache 2.0, OpenAI-compatible by default, 22K+ stars in March 2026 growing 30–35/day, 300K+ weekly npm downloads post-1.0. A NexusProvider + a maintainer signal-boost puts us in front of every Mastra agent dev.

**Channels:**
- GitHub Discussions (public, lowest-friction)
- X DMs to core maintainers (Sam Bhagwat etc.)
- A PR with the provider does the introduction work

**Send only after:** `packages/mastra-provider` is built, published to npm, and demoed end-to-end against mainnet (see `prompts/05-mastra-vercel-providers.md`).

---

## Template — GitHub Discussion post

Title: `Provider: @vdm-nexus/mastra-provider — signed inference via x402 on Solana + Base`

```
Hi team — wanted to share something we've built that plugs into Mastra
as a custom LLM provider.

VDM Nexus is a signed-inference rail — every /chat/completions call
through it gets paid per-call in USDC on Solana mainnet (or Base), and
the response carries a cryptographic receipt the caller can verify
independently. Designed to be a one-import drop-in for any
OpenAI-compatible framework, so the Mastra integration is small:

  import { NexusProvider } from "@vdm-nexus/mastra-provider";

  const agent = new Agent({
    name: "Researcher",
    model: NexusProvider({
      secretKey: process.env.AGENT_SECRET_KEY,
    }),
  });

The provider handles the x402 handshake internally. The Mastra agent
just calls the model normally; the receipt comes back via response
metadata (`result.metadata.nexus_receipt`).

Why I think this fits Mastra:
- Mastra speaks OpenAI shape natively — zero new abstractions
- Audit/compliance becomes a real story for Mastra agents (every call
  is independently verifiable, no operator-trust assumption)
- Per-call USDC means agents can pay autonomously without prepaid
  accounts

Live links:
- npm: @vdm-nexus/mastra-provider
- Example: <link to a Mastra example repo if you ship one>
- First mainnet receipt: vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e
- Docs: docs.vdmnexus.com
- Source (MIT): github.com/vdmnexus/vdmnexus

Two things I'd value:
(1) Is there a "third-party providers" listing in Mastra docs / a
    discoverable place where this should be cross-linked?
(2) Anything in the API shape that doesn't match your conventions —
    happy to PR a fix.

Not asking for a feature in Mastra core. Provider stays out-of-tree
under @vdm-nexus.
```

## Template — X DM to a core maintainer (after the discussion post)

```
Hey — quick heads-up that we shipped a Mastra provider for VDM Nexus
(signed inference, per-call USDC on Solana / Base). Posted in
Discussions <link>.

No ask beyond a read when you have a moment. Receipt:
vdmnexus.com/r/c9710ea7-9e1f-46ee-aaa9-903a536ae12e
```

(Tight. Mastra maintainers are builders; they hate boilerplate.)

## After they respond

- If "looks cool, will check it out" → thank them, link the npm package, drop it.
- If "would you submit this as a built-in provider?" → consider seriously; only good if Mastra's contribution conventions support a third-party provider becoming first-party. Don't initiate this offer.
- If "we have a different convention for X" → fix it in your provider, ship a 0.1.1, reply with the fix.

## What to bring to a call

- 60-second live demo: Mastra agent that calls a tool, calls Nexus, prints the receipt URL
- Specific request: "Where should `@vdm-nexus/mastra-provider` show up in your docs / examples? Happy to write the example PR myself."

## Don't say

- "Replace OpenAI with Nexus" (Mastra users have working stacks)
- Anything about token / launch (Mastra is a technical community; commercial pitches read as noise)
- Promises about features that aren't built (e.g. wallet/deposit autopilot)
