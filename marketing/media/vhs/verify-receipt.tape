# verify-receipt.tape — verifyReceipt() from @vdm-nexus/x402
#
# Renders the five-check verifier against a SIR v2 receipt that the
# script signs locally with a generated operator key. The receipt has
# no on-chain payment field, so the two on-chain checks are vacuously
# true; the three cryptographic checks (prompt_hash, response_hash,
# nexus_signature) exercise the real verifier code path.
#
# Render with:
#   make -C marketing/media verify-receipt

Output marketing/media/out/verify-receipt.gif
Output marketing/media/out/verify-receipt.mp4
Output marketing/media/out/verify-receipt.webm

Set Shell zsh
Set FontSize 16
Set Width 1280
Set Height 720
Set Padding 24
Set Theme { "name": "VDM Nexus", "background": "#080810", "foreground": "#f1f5f9", "cursor": "#6366f1", "black": "#0e0e18", "red": "#ef4444", "green": "#22c55e", "yellow": "#eab308", "blue": "#3b82f6", "magenta": "#6366f1", "cyan": "#06b6d4", "white": "#f1f5f9", "brightBlack": "#475569", "brightRed": "#f87171", "brightGreen": "#4ade80", "brightYellow": "#facc15", "brightBlue": "#60a5fa", "brightMagenta": "#818cf8", "brightCyan": "#22d3ee", "brightWhite": "#ffffff" }
Set TypingSpeed 30ms
Set PlaybackSpeed 1.0

Type "# Verify a signed inference receipt — five checks"
Sleep 600ms
Enter
Type "# prompt_hash + response_hash + nexus_signature + payment + payer"
Sleep 600ms
Enter
Enter

Type "npm install @vdm-nexus/x402"
Sleep 800ms
Enter
Sleep 1500ms

Type "node scripts/verify_receipt_demo.mjs"
Sleep 600ms
Enter
Sleep 4500ms

Sleep 2500ms
