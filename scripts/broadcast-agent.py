#!/usr/bin/env python3
"""Ship-broadcast agent — Phase 1.

Reads a merged or open PR, asks an LLM (via the Nexus rail it markets)
to draft X / Farcaster / Telegram / LinkedIn posts, renders the chosen
visual, and writes everything to `marketing/broadcasts/<pr#>-<slug>.md`
for human review.

Usage:
    python scripts/broadcast-agent.py <PR#>
    python scripts/broadcast-agent.py latest
    python scripts/broadcast-agent.py --commit <sha>
    python scripts/broadcast-agent.py 65 --endpoint devnet  # smoke testing
    python scripts/broadcast-agent.py 65 --skip-payment      # offline rehearsal

Exits non-zero on any failure that produces no draft. Exits zero with
"ship_worthy: false" when the model decides the PR is below the line —
no draft file is written, a one-line stderr log is printed.

The agent does NOT schedule, send, or post anywhere. Its job ends at
draft-on-disk.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
PROMPT_PATH = REPO_ROOT / "agents" / "ship-broadcast" / "prompt.md"
BROADCASTS_DIR = REPO_ROOT / "marketing" / "broadcasts"
MEDIA_DIR = REPO_ROOT / "marketing" / "media"
VHS_DIR = MEDIA_DIR / "vhs"
CACHE_PATH = Path.home() / ".cache" / "vdmnexus-broadcast-agent.json"

NEXUS_ENDPOINT_MAINNET = "https://nexus.vdmnexus.com/api/v1"
NEXUS_ENDPOINT_DEVNET = "https://nexus.vdmnexus.com/api/v1"  # same host, network selected via body
DEFAULT_MODEL = "anthropic/claude-sonnet-4"

# Packages the agent is allowed to claim. The orchestrator refreshes
# from npm + PyPI at runtime; this is the fallback.
STATIC_PUBLISHED_PACKAGES = [
    "@vdm-nexus/sdk (npm)",
    "@vdm-nexus/x402 (npm)",
    "@vdm-nexus/paywall (npm)",
    "@vdm-nexus/mcp (npm)",
    "@vdm-nexus/ai-sdk-provider (npm)",
    "@vdm-nexus/mastra-provider (npm)",
    "vdm-nexus (PyPI)",
    "langchain-vdm-nexus (PyPI)",
]

STATIC_ADAPTERS = [
    "LangChain (via langchain-vdm-nexus ChatNexus)",
    "Vercel AI SDK (via @vdm-nexus/ai-sdk-provider)",
    "Mastra (via @vdm-nexus/mastra-provider)",
    "Model Context Protocol — Claude Desktop / Cursor (via @vdm-nexus/mcp)",
    "Express / Hono / Next.js paywall middleware (via @vdm-nexus/paywall)",
]


def log(msg: str, *, err: bool = False) -> None:
    print(msg, file=sys.stderr if err else sys.stdout, flush=True)


# ----- env loading ------------------------------------------------------


def load_env_local() -> None:
    """Read TEST_AGENT_SECRET etc. from apps/nexus/.env.local in the
    user's home checkout if it is not already in os.environ."""
    if os.environ.get("TEST_AGENT_SECRET"):
        return
    candidates = [
        REPO_ROOT / "apps" / "nexus" / ".env.local",
        Path.home() / "Development" / "vdmnexus" / "apps" / "nexus" / ".env.local",
    ]
    for path in candidates:
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        return


# ----- PR resolution ----------------------------------------------------


def resolve_pr_or_commit(arg: str, *, commit: Optional[str]) -> dict[str, Any]:
    """Return a dict shaped roughly like a `gh pr view --json` payload."""
    if commit:
        cmd = [
            "gh",
            "api",
            f"repos/:owner/:repo/commits/{commit}",
            "--jq",
            '{number: null, title: .commit.message | split("\\n")[0], body: .commit.message, url: .html_url, mergedAt: .commit.author.date, state: "COMMIT", headRefName: null, files: [.files[] | {path: .filename, additions: .additions, deletions: .deletions}]}',
        ]
        result = run(cmd)
        info = json.loads(result)
        info["isCommit"] = True
        return info

    if arg.lower() == "latest":
        out = run(
            [
                "gh",
                "pr",
                "list",
                "--state",
                "all",
                "--limit",
                "1",
                "--json",
                "number",
            ]
        )
        pulls = json.loads(out)
        if not pulls:
            raise RuntimeError("no PRs found in this repo")
        num = pulls[0]["number"]
    else:
        try:
            num = int(arg)
        except ValueError as e:
            raise RuntimeError(
                f"expected a PR number or 'latest', got {arg!r}"
            ) from e

    out = run(
        [
            "gh",
            "pr",
            "view",
            str(num),
            "--json",
            "number,title,body,url,mergedAt,state,headRefName,files",
        ]
    )
    info = json.loads(out)
    info["isCommit"] = False
    return info


def run(cmd: list[str], *, check: bool = True) -> str:
    """Run a subprocess and return stdout."""
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(
            f"command failed ({res.returncode}): {' '.join(cmd)}\n"
            f"stderr: {res.stderr.strip()}"
        )
    return res.stdout


# ----- placeholder refresh ----------------------------------------------


def fetch_with_cache(url: str, *, ttl_s: int = 3600) -> Optional[dict[str, Any]]:
    """GET a URL with a tiny on-disk cache. Returns None on any failure."""
    cache = _load_cache()
    now = time.time()
    entry = cache.get(url)
    if entry and now - entry.get("ts", 0) < ttl_s:
        return entry.get("body")
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            body = json.load(resp)
        cache[url] = {"ts": now, "body": body}
        _save_cache(cache)
        return body
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        if entry:
            return entry.get("body")  # serve stale on failure
        return None


def _load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text())
    except json.JSONDecodeError:
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache))


def refresh_shipped_packages() -> list[str]:
    """Cross-reference npm + PyPI for the published Nexus packages.
    Falls back to the static list if either registry is unreachable."""
    out: list[str] = []
    npm_pkgs = [
        "@vdm-nexus/sdk",
        "@vdm-nexus/x402",
        "@vdm-nexus/paywall",
        "@vdm-nexus/mcp",
        "@vdm-nexus/ai-sdk-provider",
        "@vdm-nexus/mastra-provider",
    ]
    for name in npm_pkgs:
        encoded = name.replace("@", "%40").replace("/", "%2F")
        body = fetch_with_cache(f"https://registry.npmjs.org/{encoded}")
        if body and "dist-tags" in body:
            ver = body["dist-tags"].get("latest", "?")
            out.append(f"{name}@{ver} (npm)")
        else:
            out.append(f"{name} (npm)")

    pypi_pkgs = ["vdm-nexus", "langchain-vdm-nexus"]
    for name in pypi_pkgs:
        body = fetch_with_cache(f"https://pypi.org/pypi/{name}/json")
        if body and "info" in body:
            ver = body["info"].get("version", "?")
            out.append(f"{name}=={ver} (PyPI)")
        else:
            out.append(f"{name} (PyPI)")

    if not out:
        return STATIC_PUBLISHED_PACKAGES
    return out


def refresh_adapters(packages: list[str]) -> list[str]:
    """Derive the framework-adapter list from the published packages.
    Static-ish — adapters don't appear/disappear often."""
    has_langchain = any("langchain-vdm-nexus" in p for p in packages)
    has_ai_sdk = any("ai-sdk-provider" in p for p in packages)
    has_mastra = any("mastra-provider" in p for p in packages)
    has_mcp = any("@vdm-nexus/mcp" in p for p in packages)
    has_paywall = any("@vdm-nexus/paywall" in p for p in packages)

    adapters: list[str] = []
    if has_langchain:
        adapters.append(
            "LangChain (via langchain-vdm-nexus ChatNexus — also reachable from LangGraph and CrewAI through BaseChatModel)"
        )
    if has_ai_sdk:
        adapters.append("Vercel AI SDK (via @vdm-nexus/ai-sdk-provider)")
    if has_mastra:
        adapters.append("Mastra (via @vdm-nexus/mastra-provider)")
    if has_mcp:
        adapters.append(
            "Model Context Protocol — Claude Desktop and Cursor (via @vdm-nexus/mcp)"
        )
    if has_paywall:
        adapters.append(
            "Express / Hono / Next.js paywall middleware (via @vdm-nexus/paywall)"
        )
    return adapters or STATIC_ADAPTERS


def list_vhs_tapes() -> list[str]:
    if not VHS_DIR.exists():
        return []
    return sorted(p.stem for p in VHS_DIR.glob("*.tape"))


# ----- prompt rendering -------------------------------------------------


def render_prompt(
    *,
    current_date: str,
    packages: list[str],
    adapters: list[str],
    vhs_tapes: list[str],
) -> str:
    raw = PROMPT_PATH.read_text()
    raw = raw.replace("{{CURRENT_DATE}}", current_date)
    raw = raw.replace(
        "{{SHIPPED_PACKAGES_LIST}}",
        "\n".join(f"  - {p}" for p in packages),
    )
    raw = raw.replace(
        "{{SHIPPED_ADAPTERS_LIST}}",
        "\n".join(f"  - {a}" for a in adapters)
        if adapters
        else "  - (none currently)",
    )
    raw = raw.replace(
        "{{AVAILABLE_VHS_TAPES}}",
        "\n".join(f"  - {t}" for t in vhs_tapes)
        if vhs_tapes
        else "  - (none currently)",
    )
    return raw


def read_agent_version() -> str:
    """Read the version: field from the prompt frontmatter."""
    raw = PROMPT_PATH.read_text()
    m = re.search(r"^version:\s*(\S+)\s*$", raw, re.MULTILINE)
    return m.group(1) if m else "0.0.0"


# ----- output validation ------------------------------------------------


PLATFORM_LIMITS = {
    "x": 280,
    "farcaster": 320,
    "telegram": 4096,
    "linkedin": 3000,
}

PLATFORM_LABEL = {
    "x": "X",
    "farcaster": "Farcaster",
    "telegram": "Telegram",
    "linkedin": "LinkedIn",
}


class ValidationError(Exception):
    pass


def validate_output(payload: dict[str, Any]) -> None:
    """Validate the agent's JSON output against the documented schema.
    Raises ValidationError on the first failure with an actionable msg.

    This is the canonical Python validator. The TS sibling at
    scripts/validate-broadcast-output.ts implements the same checks
    so CI can run it without a Python toolchain.
    """
    if not isinstance(payload, dict):
        raise ValidationError(f"top-level must be an object, got {type(payload).__name__}")

    required = {"ship_worthy", "skip_reason", "x", "farcaster", "telegram", "linkedin", "visual", "self_check"}
    missing = required - payload.keys()
    if missing:
        raise ValidationError(f"missing top-level keys: {sorted(missing)}")

    if not isinstance(payload["ship_worthy"], bool):
        raise ValidationError("ship_worthy must be boolean")

    sw = payload["ship_worthy"]
    sr = payload["skip_reason"]
    if sw and sr is not None:
        raise ValidationError("ship_worthy=true requires skip_reason=null")
    if not sw and (not isinstance(sr, str) or not sr.strip()):
        raise ValidationError("ship_worthy=false requires a non-empty skip_reason")

    drafted = 0
    for platform, limit in PLATFORM_LIMITS.items():
        entry = payload[platform]
        if entry is None:
            if sw:
                # null is allowed on a ship-worthy PR if the agent chose
                # to skip that platform — visual.rationale must explain.
                continue
            else:
                continue
        if not sw:
            raise ValidationError(
                f"ship_worthy=false but {platform} draft is not null"
            )
        if not isinstance(entry, dict):
            raise ValidationError(f"{platform} must be object or null")
        text = entry.get("text")
        char_count = entry.get("char_count")
        if not isinstance(text, str) or not text.strip():
            raise ValidationError(f"{platform}.text must be a non-empty string")
        if not isinstance(char_count, int):
            raise ValidationError(f"{platform}.char_count must be an integer")
        actual = len(text)
        if actual > limit:
            raise ValidationError(
                f"{platform} text exceeds {limit} char limit (got {actual})"
            )
        # char_count is model-reported and the model can miscount by a
        # few chars. Don't fail the run — the orchestrator overwrites
        # char_count with the true length before writing the draft.
        drafted += 1

    visual = payload["visual"]
    if not isinstance(visual, dict):
        raise ValidationError("visual must be an object")
    src = visual.get("source")
    allowed_sources = {"silicon", "screen-studio", "remotion-reel", "skip"}
    if not isinstance(src, str):
        raise ValidationError("visual.source must be a string")
    if not (src in allowed_sources or src.startswith("vhs:")):
        raise ValidationError(
            f"visual.source must be one of {sorted(allowed_sources)} or vhs:<tape>; got {src!r}"
        )
    if not isinstance(visual.get("rationale"), str) or not visual["rationale"].strip():
        raise ValidationError("visual.rationale must be a non-empty string")

    sc = payload["self_check"]
    if not isinstance(sc, dict):
        raise ValidationError("self_check must be an object")
    sc_required = {"vocabulary_ok", "no_unshipped_claims", "char_counts_accurate", "platforms_drafted"}
    missing_sc = sc_required - sc.keys()
    if missing_sc:
        raise ValidationError(f"self_check missing keys: {sorted(missing_sc)}")
    if not isinstance(sc["platforms_drafted"], int):
        raise ValidationError("self_check.platforms_drafted must be an integer")
    if sc["platforms_drafted"] != drafted:
        raise ValidationError(
            f"self_check.platforms_drafted={sc['platforms_drafted']} but {drafted} drafts present"
        )


# ----- visual rendering -------------------------------------------------


def render_visual(visual: dict[str, Any], *, pr_number: int, slug: str) -> Optional[Path]:
    """Render the visual chosen by the agent. Returns the output path,
    or None on skip / screen-studio / failure."""
    src = visual["source"]

    if src == "skip":
        return None

    if src == "screen-studio":
        log(
            f"[visual] screen-studio requested — operator must record manually "
            f"and drop into marketing/media/out/{pr_number}-{slug}.mp4",
            err=True,
        )
        return None

    if src == "remotion-reel":
        out = run_make("reel-weekly")
        return MEDIA_DIR / "out" / "weekly-ships-reel.mp4" if out else None

    if src.startswith("vhs:"):
        tape_name = src.split(":", 1)[1]
        tape_target = tape_name
        # Honor that the Makefile target name == the tape basename for
        # the existing tapes (python-sdk-x402, verify-receipt,
        # langchain-chat-nexus).
        return run_vhs_target(tape_target)

    if src == "silicon":
        return run_silicon(visual, pr_number=pr_number, slug=slug)

    log(f"[visual] unknown source {src!r}; skipping render", err=True)
    return None


def run_make(target: str) -> Optional[Path]:
    try:
        subprocess.run(
            ["make", "-C", str(MEDIA_DIR), target],
            check=True,
            capture_output=True,
            text=True,
        )
        return MEDIA_DIR / "out"
    except subprocess.CalledProcessError as e:
        log(
            f"[visual] make {target} failed: {e.stderr.strip()}",
            err=True,
        )
        return None


def run_vhs_target(target: str) -> Optional[Path]:
    if shutil.which("vhs") is None:
        log("[visual] vhs not installed — install with: brew install vhs", err=True)
        return None
    tape = VHS_DIR / f"{target}.tape"
    if not tape.exists():
        log(f"[visual] tape not found: {tape}", err=True)
        return None
    # The tape `Output` directives use repo-root-relative paths, so
    # invoke vhs with CWD=REPO_ROOT rather than via the Makefile (which
    # `cd`s into marketing/media/ and produces a double-nested path).
    try:
        subprocess.run(
            ["vhs", str(tape.relative_to(REPO_ROOT))],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as e:
        log(f"[visual] vhs failed: {e.stderr.strip()}", err=True)
        return None
    candidate = MEDIA_DIR / "out" / f"{target}.gif"
    return candidate if candidate.exists() else None


def run_silicon(visual: dict[str, Any], *, pr_number: int, slug: str) -> Optional[Path]:
    if shutil.which("silicon") is None:
        log(
            "[visual] silicon not installed — install with: "
            "brew install silicon && brew install --cask font-jetbrains-mono",
            err=True,
        )
        return None
    file_rel = visual.get("file")
    lang = visual.get("lang") or ""
    if not file_rel:
        log("[visual] silicon source requires `file`", err=True)
        return None
    file_path = (REPO_ROOT / file_rel).resolve()
    if not file_path.exists():
        log(
            f"[visual] silicon: file does not exist: {file_rel}",
            err=True,
        )
        return None
    target_slug = visual.get("slug") or f"{pr_number}-{slug}"
    cmd = [
        "make",
        "-C",
        str(MEDIA_DIR),
        "code-snippet",
        f"FILE={file_path}",
        f"SLUG={target_slug}",
    ]
    if lang:
        cmd.append(f"LANG={lang}")
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        log(f"[visual] silicon render failed: {e.stderr.strip()}", err=True)
        return None
    out_path = MEDIA_DIR / "out" / f"{target_slug}-code.png"
    return out_path if out_path.exists() else None


# ----- draft file -------------------------------------------------------


def slugify(text: str, *, max_len: int = 40) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:max_len].rstrip("-") or "untitled"


def write_draft(
    *,
    pr: dict[str, Any],
    payload: dict[str, Any],
    receipt: Optional[dict[str, Any]],
    visual_path: Optional[Path],
    agent_version: str,
    model: str,
) -> Path:
    BROADCASTS_DIR.mkdir(parents=True, exist_ok=True)
    pr_num = pr.get("number")
    slug = slugify(pr.get("title", ""))
    filename = f"{pr_num}-{slug}.md" if pr_num else f"commit-{slug}.md"
    path = BROADCASTS_DIR / filename

    lines: list[str] = []
    title = pr.get("title", "untitled")
    pr_url = pr.get("url", "")
    lines.append(f"# Broadcast — PR #{pr_num} — {title}")
    lines.append("")
    lines.append(f"**Type**: drafted by ship-broadcast agent v{agent_version}")
    lines.append(f"**Linked PR**: {pr_url}")
    lines.append(
        f"**Drafted**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} "
        f"by ship-broadcast agent (model: {model})"
    )
    lines.append("**Status**: in review — human approval gate required before scheduling")
    lines.append("")
    lines.append("---")
    lines.append("")

    for platform, limit in PLATFORM_LIMITS.items():
        label = PLATFORM_LABEL[platform]
        entry = payload[platform]
        if entry is None:
            lines.append(f"## {label} — skipped")
            lines.append("")
            continue
        text = entry["text"]
        # Always use the true text length in the draft — the model's
        # char_count is best-effort and can drift by a few chars.
        count = len(text)
        lines.append(f"## {label} ({count}/{limit})")
        lines.append("")
        lines.append("```")
        lines.append(text)
        lines.append("```")
        lines.append("")

    visual = payload["visual"]
    lines.append("## Visual")
    lines.append("")
    if visual_path and visual_path.exists():
        rel = visual_path.relative_to(REPO_ROOT)
        lines.append(f"- File: `{rel}`")
    else:
        lines.append("- File: _(not rendered — see source/rationale below)_")
    lines.append(f"- Source: `{visual['source']}`")
    lines.append(f"- Rationale: {visual['rationale']}")
    if visual.get("file"):
        lines.append(f"- Input file: `{visual['file']}`")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Schedule")
    lines.append("")
    lines.append("| Platform | Status | Scheduled for | Postiz ID |")
    lines.append("|---|---|---|---|")
    for platform in PLATFORM_LIMITS:
        label = PLATFORM_LABEL[platform]
        if payload[platform] is None:
            lines.append(f"| {label} | skipped | — | — |")
        else:
            lines.append(f"| {label} | pending review | — | — |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Agent provenance")
    lines.append("")
    lines.append(f"- Agent: ship-broadcast v{agent_version}")
    lines.append(f"- Model: `{model}`")
    if receipt:
        inference_id = receipt.get("inference_id")
        tx = (receipt.get("payment") or {}).get("tx_signature")
        if inference_id:
            lines.append(
                f"- Receipt: [`vdmnexus.com/r/{inference_id}`]"
                f"(https://vdmnexus.com/r/{inference_id})"
            )
        if tx:
            lines.append(f"- Settlement tx: `{tx}`")
    else:
        lines.append("- Receipt: _(not captured — see run log)_")
    lines.append("")
    lines.append(
        "_Generated by the Nexus ship-broadcast agent. Drafts only — "
        "no platform was contacted. Approve per-platform before scheduling._"
    )
    lines.append("")

    path.write_text("\n".join(lines))
    return path


def write_failed_draft(pr_number: Any, raw_output: str, error: str) -> Path:
    BROADCASTS_DIR.mkdir(parents=True, exist_ok=True)
    path = BROADCASTS_DIR / f"{pr_number}-DRAFT-FAILED.md"
    body = (
        f"# Draft FAILED — PR #{pr_number}\n\n"
        f"The ship-broadcast agent returned output that failed validation.\n\n"
        f"**Error:** `{error}`\n\n"
        f"## Raw model output\n\n"
        f"```\n{raw_output}\n```\n"
    )
    path.write_text(body)
    return path


# ----- agent call -------------------------------------------------------


def build_user_message(pr: dict[str, Any]) -> str:
    title = pr.get("title") or ""
    body = pr.get("body") or ""
    state = pr.get("state") or "UNKNOWN"
    merged_at = pr.get("mergedAt") or "(not merged)"
    head = pr.get("headRefName") or "(no branch)"
    files = pr.get("files") or []

    files_summary_lines = []
    for f in files[:50]:
        path = f.get("path") or f.get("filename") or ""
        adds = f.get("additions")
        dels = f.get("deletions")
        if adds is None and dels is None:
            files_summary_lines.append(f"- {path}")
        else:
            files_summary_lines.append(f"- {path} (+{adds}/-{dels})")
    if len(files) > 50:
        files_summary_lines.append(f"... and {len(files) - 50} more files")

    return (
        f"Draft broadcast posts for this PR.\n\n"
        f"## PR metadata\n"
        f"- Number: {pr.get('number')}\n"
        f"- Title: {title}\n"
        f"- URL: {pr.get('url')}\n"
        f"- State: {state}\n"
        f"- Merged at: {merged_at}\n"
        f"- Branch: {head}\n\n"
        f"## PR body\n\n{body or '(no body)'}\n\n"
        f"## Changed files\n\n"
        + ("\n".join(files_summary_lines) if files_summary_lines else "(none)")
        + "\n"
    )


async def call_agent(
    *,
    system_prompt: str,
    user_message: str,
    model: str,
    endpoint: str,
    network: str,
    secret_key_b58: str,
    skip_payment: bool,
) -> tuple[str, Optional[dict[str, Any]]]:
    """Make the actual payAndInfer call.

    Returns (raw_text, receipt_dict_or_None).
    """
    if skip_payment:
        # Offline rehearsal — used by tests / when no funds available.
        # The orchestrator path is the same; only the LLM call is mocked.
        raise RuntimeError(
            "skip-payment mode is not wired up yet — Phase 1 always "
            "settles a real payment to prove the rail eats its own dog food."
        )

    try:
        from vdm_nexus import X402Agent  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "vdm-nexus is not installed in this Python environment. "
            "Run: pip install vdm-nexus"
        ) from e

    agent = X402Agent.from_base58(secret_key_b58)
    log(f"[agent] pubkey: {agent.pubkey}")
    log(f"[agent] model: {model}")
    log(f"[agent] endpoint: {endpoint}")
    log(f"[agent] network: {network}")

    result = await agent.pay_and_infer(
        endpoint,
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        network=network,
    )

    text = result.openai["choices"][0]["message"]["content"]
    return text, result.receipt


def extract_json_block(raw: str) -> str:
    """Pull the JSON object out of the model's reply.

    Most models comply with "return JSON only" but a few wrap it in
    ```json fences or precede it with a short preamble. Tolerate both
    rather than fail the whole run on a cosmetic violation — but the
    validator still enforces strictness on the parsed shape.
    """
    raw = raw.strip()
    if raw.startswith("```"):
        first = raw.find("\n")
        last = raw.rfind("```")
        if first != -1 and last != -1 and last > first:
            raw = raw[first + 1 : last].strip()
    # If still not JSON, find the first { and matching last }.
    if not raw.startswith("{"):
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            raw = raw[first_brace : last_brace + 1]
    return raw


# ----- main -------------------------------------------------------------


async def amain() -> int:
    parser = argparse.ArgumentParser(
        description="Draft broadcast posts for a Nexus PR using signed inference.",
    )
    parser.add_argument(
        "pr",
        help="PR number, or 'latest', or '--commit <sha>' (positional ignored when --commit set)",
        nargs="?",
        default="latest",
    )
    parser.add_argument("--commit", help="Broadcast a commit instead of a PR")
    parser.add_argument(
        "--endpoint",
        default="mainnet",
        choices=["mainnet", "devnet"],
        help="Which Nexus network to settle on. Default: mainnet.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"OpenRouter model slug. Default: {DEFAULT_MODEL}.",
    )
    parser.add_argument(
        "--secret-env",
        default=None,
        help="Env var name holding the agent's base58 secret key. "
        "Default: TEST_AGENT_SECRET on mainnet, DEMO_AGENT_SECRET_KEY on devnet.",
    )
    parser.add_argument(
        "--skip-payment",
        action="store_true",
        help="(reserved) Skip the on-chain payment — not supported in Phase 1.",
    )
    args = parser.parse_args()

    if args.endpoint == "mainnet":
        endpoint = NEXUS_ENDPOINT_MAINNET
        network = "solana:mainnet"
        default_secret_env = "TEST_AGENT_SECRET"
    else:
        endpoint = NEXUS_ENDPOINT_DEVNET
        network = "solana:devnet"
        default_secret_env = "DEMO_AGENT_SECRET_KEY"
    secret_env = args.secret_env or default_secret_env

    load_env_local()
    secret_key = os.environ.get(secret_env)
    if not secret_key:
        log(
            f"[fatal] ${secret_env} not set. For mainnet smoke testing, "
            f"source apps/nexus/.env.local first.",
            err=True,
        )
        return 2

    pr = resolve_pr_or_commit(args.pr, commit=args.commit)
    pr_num = pr.get("number") or pr.get("isCommit") and args.commit
    log(f"[pr] #{pr.get('number')} {pr.get('title')!r}")

    # Refresh placeholders.
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log("[refresh] querying npm + PyPI for published package versions...")
    packages = refresh_shipped_packages()
    adapters = refresh_adapters(packages)
    vhs_tapes = list_vhs_tapes()
    log(
        f"[refresh] {len(packages)} packages, {len(adapters)} adapters, "
        f"{len(vhs_tapes)} VHS tapes"
    )

    system_prompt = render_prompt(
        current_date=current_date,
        packages=packages,
        adapters=adapters,
        vhs_tapes=vhs_tapes,
    )
    user_message = build_user_message(pr)

    raw, receipt = await call_agent(
        system_prompt=system_prompt,
        user_message=user_message,
        model=args.model,
        endpoint=endpoint,
        network=network,
        secret_key_b58=secret_key,
        skip_payment=args.skip_payment,
    )

    if receipt:
        log(f"[receipt] {receipt.get('inference_id')}")
        tx = (receipt.get("payment") or {}).get("tx_signature")
        if tx:
            log(f"[receipt] tx: {tx}")

    raw_json = extract_json_block(raw)
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as e:
        log(f"[fatal] model output is not valid JSON: {e}", err=True)
        path = write_failed_draft(pr.get("number"), raw, str(e))
        log(f"[fatal] raw output written to {path}", err=True)
        return 3

    try:
        validate_output(payload)
    except ValidationError as e:
        log(f"[fatal] model output failed schema validation: {e}", err=True)
        path = write_failed_draft(pr.get("number"), raw, str(e))
        log(f"[fatal] raw output written to {path}", err=True)
        return 4

    if not payload["ship_worthy"]:
        log(
            f"[skip] ship_worthy=false — {payload['skip_reason']}",
            err=True,
        )
        return 0

    # Render visual and write draft.
    slug = slugify(pr.get("title", ""))
    visual_path = render_visual(payload["visual"], pr_number=pr.get("number") or 0, slug=slug)
    agent_version = read_agent_version()
    draft_path = write_draft(
        pr=pr,
        payload=payload,
        receipt=receipt,
        visual_path=visual_path,
        agent_version=agent_version,
        model=args.model,
    )

    rel_draft = draft_path.relative_to(REPO_ROOT)
    rel_visual = visual_path.relative_to(REPO_ROOT) if visual_path else "(none)"
    receipt_id = receipt.get("inference_id") if receipt else "(none)"
    log("")
    log(f"draft   {rel_draft}")
    log(f"visual  {rel_visual}")
    log(f"receipt {receipt_id}")
    return 0


def main() -> None:
    try:
        rc = asyncio.run(amain())
    except KeyboardInterrupt:
        log("[abort] interrupted", err=True)
        rc = 130
    sys.exit(rc)


if __name__ == "__main__":
    main()
