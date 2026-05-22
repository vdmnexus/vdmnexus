# python-sdk-x402.tape — pip install vdm-nexus → X402Agent.pay_and_infer
#
# Renders the Python SDK x402 handshake end-to-end against a mocked
# transport. Real SDK code path runs; only the network is faked. See
# scripts/python_sdk_x402_demo.py for the source.
#
# Render with:
#   make -C marketing/media python-sdk-x402
# or directly:
#   vhs marketing/media/vhs/python-sdk-x402.tape

Output marketing/media/out/python-sdk-x402.gif
Output marketing/media/out/python-sdk-x402.mp4
Output marketing/media/out/python-sdk-x402.webm

Set Shell zsh
Set FontSize 16
Set Width 1280
Set Height 720
Set Padding 24
Set Theme { "name": "VDM Nexus", "background": "#080810", "foreground": "#f1f5f9", "cursor": "#6366f1", "black": "#0e0e18", "red": "#ef4444", "green": "#22c55e", "yellow": "#eab308", "blue": "#3b82f6", "magenta": "#6366f1", "cyan": "#06b6d4", "white": "#f1f5f9", "brightBlack": "#475569", "brightRed": "#f87171", "brightGreen": "#4ade80", "brightYellow": "#facc15", "brightBlue": "#60a5fa", "brightMagenta": "#818cf8", "brightCyan": "#22d3ee", "brightWhite": "#ffffff" }
Set TypingSpeed 30ms
Set PlaybackSpeed 1.0

Type "# Python agents that pay for their own inference"
Sleep 600ms
Enter
Type "# Solana keypair identity, x402 USDC per call, SIR v2 receipts"
Sleep 600ms
Enter
Enter

Type "pip install vdm-nexus"
Sleep 800ms
Enter
Sleep 1500ms

Type "python3 scripts/python_sdk_x402_demo.py"
Sleep 600ms
Enter
Sleep 4500ms

Sleep 2500ms
