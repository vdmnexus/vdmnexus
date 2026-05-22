# Marketing media renders — VHS terminal demos + Remotion ship reels.
#
# Targets here build GIFs / MP4s into ./out/ (gitignored). The .tape
# scripts and demo source they invoke are checked in. Run `make help`
# for the menu.

OUT := out
VHS := vhs/python-sdk-x402.tape vhs/verify-receipt.tape vhs/langchain-chat-nexus.tape

.PHONY: help all clean check-vhs python-sdk-x402 verify-receipt langchain-chat-nexus reel-weekly logo-intro logo-intro-square

help:
	@echo "VDM Nexus marketing-media renders"
	@echo ""
	@echo "  make all                  — render every tape in vhs/"
	@echo "  make python-sdk-x402      — pip install vdm-nexus + pay_and_infer demo"
	@echo "  make verify-receipt       — verifyReceipt() five-check demo"
	@echo "  make langchain-chat-nexus — ChatNexus inside a LangGraph node"
	@echo "  make reel-weekly          — Remotion 'this week we shipped' reel"
	@echo "  make logo-intro           — 1.8s signed-inference logo pre-roll (16:9)"
	@echo "  make logo-intro-square    — 1.8s logo pre-roll (1:1, social-friendly)"
	@echo "  make clean                — wipe ./out"
	@echo ""
	@echo "Prerequisites:"
	@echo "  vhs       — brew install vhs        (or see github.com/charmbracelet/vhs)"
	@echo "  ffmpeg    — brew install ffmpeg     (needed by vhs for mp4/webm)"
	@echo "  node 20+, pnpm 10+ for Remotion + verify-receipt"
	@echo "  python 3.11+, the Python demos pull deps via pip install"

check-vhs:
	@command -v vhs >/dev/null 2>&1 || { \
	  echo "vhs not installed. brew install vhs (macOS) or see"; \
	  echo "https://github.com/charmbracelet/vhs for other platforms."; \
	  exit 1; \
	}

$(OUT):
	mkdir -p $(OUT)

python-sdk-x402: check-vhs | $(OUT)
	vhs vhs/python-sdk-x402.tape

verify-receipt: check-vhs | $(OUT)
	vhs vhs/verify-receipt.tape

langchain-chat-nexus: check-vhs | $(OUT)
	vhs vhs/langchain-chat-nexus.tape

all: python-sdk-x402 verify-receipt langchain-chat-nexus

reel-weekly: | $(OUT)
	cd remotion && npm install --no-audit --no-fund && \
	  npx remotion render src/index.ts WeeklyShipsReel ../$(OUT)/weekly-ships-reel.mp4

logo-intro: | $(OUT)
	cd remotion && npm install --no-audit --no-fund && \
	  npx remotion render src/index.ts LogoIntro ../$(OUT)/logo-intro.mp4 && \
	  npx remotion render src/index.ts LogoIntro ../$(OUT)/logo-intro.gif

logo-intro-square: | $(OUT)
	cd remotion && npm install --no-audit --no-fund && \
	  npx remotion render src/index.ts LogoIntroSquare ../$(OUT)/logo-intro-square.mp4 && \
	  npx remotion render src/index.ts LogoIntroSquare ../$(OUT)/logo-intro-square.gif

clean:
	rm -rf $(OUT)
