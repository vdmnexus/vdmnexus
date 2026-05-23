# Marketing media renders — VHS terminal demos + Remotion ship reels.
#
# Targets here build GIFs / MP4s into ./out/ (gitignored). The .tape
# scripts and demo source they invoke are checked in. Run `make help`
# for the menu.

OUT := out
VHS := vhs/python-sdk-x402.tape vhs/verify-receipt.tape vhs/langchain-chat-nexus.tape

# silicon brand presets — keep aligned with the ray.so preset documented in
# README.md so CLI-rendered and ray.so-rendered snippets look like one product.
# HASH trick: literal `#` in a Make assignment terminates the line as a comment,
# so we route hex colors through `$(HASH)` to dodge that.
HASH          := \#
SILICON_THEME ?= OneHalfDark
SILICON_FONT  ?= JetBrains Mono=20
SILICON_BG    ?= $(HASH)080810

.PHONY: help all clean check-vhs check-silicon python-sdk-x402 verify-receipt langchain-chat-nexus reel-weekly logo-intro logo-intro-square code-snippet code-snippet-paste

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
	@echo "  make code-snippet         — code-shape PNG from a file (silicon)"
	@echo "                              FILE=<path> [SLUG=<name>] [LANG=<lang>]"
	@echo "  make code-snippet-paste   — code-shape PNG from clipboard (silicon)"
	@echo "                              SLUG=<name> LANG=<lang>"
	@echo "  make clean                — wipe ./out"
	@echo ""
	@echo "Prerequisites:"
	@echo "  vhs       — brew install vhs        (or see github.com/charmbracelet/vhs)"
	@echo "  ffmpeg    — brew install ffmpeg     (needed by vhs for mp4/webm)"
	@echo "  silicon   — brew install silicon    (or see github.com/Aloxaf/silicon)"
	@echo "  JetBrains Mono font — brew install --cask font-jetbrains-mono"
	@echo "                       (required by code-snippet*; override with SILICON_FONT=)"
	@echo "  node 20+, pnpm 10+ for Remotion + verify-receipt"
	@echo "  python 3.11+, the Python demos pull deps via pip install"

check-vhs:
	@command -v vhs >/dev/null 2>&1 || { \
	  echo "vhs not installed. brew install vhs (macOS) or see"; \
	  echo "https://github.com/charmbracelet/vhs for other platforms."; \
	  exit 1; \
	}

check-silicon:
	@command -v silicon >/dev/null 2>&1 || { \
	  echo "silicon not installed. brew install silicon (macOS) or see"; \
	  echo "https://github.com/Aloxaf/silicon for other platforms."; \
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

code-snippet:
	@if [ -z "$(FILE)" ]; then \
	  echo "Usage: make code-snippet FILE=<path> [SLUG=<name>] [LANG=<lang>]"; \
	  echo ""; \
	  echo "  FILE  path to the source file (required)"; \
	  echo "  SLUG  output basename; defaults to FILE basename without extension"; \
	  echo "  LANG  syntax override (e.g. ts, py, rust); defaults to FILE extension"; \
	  echo ""; \
	  echo "Example:"; \
	  echo "  make code-snippet FILE=../../examples/python-quickstart.py SLUG=python-quickstart"; \
	  exit 1; \
	fi
	@command -v silicon >/dev/null 2>&1 || { \
	  echo "silicon not installed. brew install silicon (macOS) or see"; \
	  echo "https://github.com/Aloxaf/silicon for other platforms."; \
	  exit 1; \
	}
	@mkdir -p $(OUT)
	$(eval RESOLVED_SLUG := $(or $(SLUG),$(basename $(notdir $(FILE)))))
	$(eval LANG_FLAG := $(if $(LANG),--language $(LANG),))
	silicon \
	  --background "$(SILICON_BG)" \
	  --theme "$(SILICON_THEME)" \
	  --font "$(SILICON_FONT)" \
	  --pad-horiz 80 \
	  --pad-vert 80 \
	  --shadow-blur-radius 30 \
	  --shadow-offset-y 8 \
	  --no-window-controls \
	  --no-line-number \
	  $(LANG_FLAG) \
	  --output $(OUT)/$(RESOLVED_SLUG)-code.png \
	  $(FILE)
	@echo "→ $(OUT)/$(RESOLVED_SLUG)-code.png"

code-snippet-paste:
	@if [ -z "$(SLUG)" ] || [ -z "$(LANG)" ]; then \
	  echo "Usage: make code-snippet-paste SLUG=<name> LANG=<lang>"; \
	  echo ""; \
	  echo "Reads the snippet from your clipboard (pbpaste, macOS) and renders"; \
	  echo "it to out/<SLUG>-code.png. LANG is required because stdin has no"; \
	  echo "extension to auto-detect from."; \
	  echo ""; \
	  echo "Example:"; \
	  echo "  # copy a snippet to clipboard, then:"; \
	  echo "  make code-snippet-paste SLUG=pay-and-infer LANG=ts"; \
	  exit 1; \
	fi
	@command -v silicon >/dev/null 2>&1 || { \
	  echo "silicon not installed. brew install silicon (macOS) or see"; \
	  echo "https://github.com/Aloxaf/silicon for other platforms."; \
	  exit 1; \
	}
	@command -v pbpaste >/dev/null 2>&1 || { \
	  echo "pbpaste not found. code-snippet-paste is macOS-only — use code-snippet FILE=... on Linux."; \
	  exit 1; \
	}
	@mkdir -p $(OUT)
	pbpaste | silicon \
	  --background "$(SILICON_BG)" \
	  --theme "$(SILICON_THEME)" \
	  --font "$(SILICON_FONT)" \
	  --pad-horiz 80 \
	  --pad-vert 80 \
	  --shadow-blur-radius 30 \
	  --shadow-offset-y 8 \
	  --no-window-controls \
	  --no-line-number \
	  --language $(LANG) \
	  --output $(OUT)/$(SLUG)-code.png \
	  -
	@echo "→ $(OUT)/$(SLUG)-code.png"

clean:
	rm -rf $(OUT)
