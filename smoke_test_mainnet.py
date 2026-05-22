"""Mainnet smoke test for vdm-nexus.

DO NOT run this casually. Every successful call settles $0.01 USDC of
real money on Solana mainnet. This is the production rail.

Prerequisites:
  1. A funded agent wallet on Solana mainnet:
     - At least 0.5 USDC at the canonical mainnet USDC mint
       (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
     - 0 SOL needed (facilitator covers gas)
  2. export AGENT_SECRET_KEY=<base58 64-byte secret>
  3. The mainnet rail must be live (nexus.vdmnexus.com/api/v1).

Run with:
  python smoke_test_mainnet.py

Single successful call costs $0.01 USDC. Receipt URL is printed at
the end — that's a permanent on-chain settlement receipt.
"""

import asyncio
import os
import sys
import traceback

from vdm_nexus import X402Agent

ENDPOINT = "https://nexus.vdmnexus.com/api/v1"
NETWORK = "solana:mainnet"
USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


async def main() -> None:
    secret = os.environ.get("AGENT_SECRET_KEY")
    if not secret:
        print("ERROR: set AGENT_SECRET_KEY env var first")
        print("       (base58 64-byte secret for a mainnet-funded agent)")
        sys.exit(1)

    agent = X402Agent.from_base58(secret)
    print(f"Agent pubkey: {agent.pubkey}")
    print(f"Endpoint:     {ENDPOINT}")
    print(f"Network:      {NETWORK}  <-- REAL MAINNET, REAL USDC")
    print(f"Expected USDC mint: {USDC_MINT_MAINNET}")
    print("")
    print("This will spend ~$0.01 USDC.  Ctrl+C in the next 5 seconds to abort.")
    try:
        await asyncio.sleep(5)
    except KeyboardInterrupt:
        print("\nAborted.")
        return

    print("Firing pay_and_infer on mainnet...\n")
    try:
        result = await agent.pay_and_infer(
            endpoint=ENDPOINT,
            model="openai/gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": "Reply with exactly: 'mainnet receipt live'.",
                }
            ],
            network=NETWORK,
        )
        print("RESPONSE:", result.openai["choices"][0]["message"]["content"])
        if result.receipt:
            print(
                f"RECEIPT:  https://vdmnexus.com/r/{result.receipt['inference_id']}"
            )
            print("   Click that — should be five-check green on verify.vdmnexus.com")
            print("   On-chain settlement is permanent.")
        else:
            print("WARN: no receipt returned (OpenAI body still came back)")
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}\n")
        traceback.print_exc()
        print(
            "\nNo USDC was spent if the failure was before the paid POST. "
            "If you see RECEIPT info above, the spend happened."
        )


if __name__ == "__main__":
    asyncio.run(main())
