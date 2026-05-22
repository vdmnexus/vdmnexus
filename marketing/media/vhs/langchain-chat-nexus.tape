# langchain-chat-nexus.tape — ChatNexus inside a LangGraph node
#
# Renders the langchain-vdm-nexus adapter end-to-end: a real LangGraph
# state graph, a real ChatNexus(BaseChatModel) instance, and an
# AIMessage with the SIR v2 receipt landed on `response_metadata`.
# Only the X402Agent.pay_and_infer call is patched, so the wire stays
# deterministic and the render never costs USDC. See
# scripts/langchain_chat_nexus_demo.py.
#
# Render with:
#   make -C marketing/media langchain-chat-nexus

Output marketing/media/out/langchain-chat-nexus.gif
Output marketing/media/out/langchain-chat-nexus.mp4
Output marketing/media/out/langchain-chat-nexus.webm

Set Shell zsh
Set FontSize 16
Set Width 1280
Set Height 720
Set Padding 24
Set Theme { "name": "VDM Nexus", "background": "#080810", "foreground": "#f1f5f9", "cursor": "#6366f1", "black": "#0e0e18", "red": "#ef4444", "green": "#22c55e", "yellow": "#eab308", "blue": "#3b82f6", "magenta": "#6366f1", "cyan": "#06b6d4", "white": "#f1f5f9", "brightBlack": "#475569", "brightRed": "#f87171", "brightGreen": "#4ade80", "brightYellow": "#facc15", "brightBlue": "#60a5fa", "brightMagenta": "#818cf8", "brightCyan": "#22d3ee", "brightWhite": "#ffffff" }
Set TypingSpeed 30ms
Set PlaybackSpeed 1.0

Type "# Drop signed inference into LangGraph"
Sleep 600ms
Enter
Type "# ChatNexus is a BaseChatModel — receipt lands on response_metadata"
Sleep 600ms
Enter
Enter

Type "pip install langchain-vdm-nexus langgraph"
Sleep 800ms
Enter
Sleep 1500ms

Type "python3 scripts/langchain_chat_nexus_demo.py"
Sleep 600ms
Enter
Sleep 4500ms

Sleep 2500ms
