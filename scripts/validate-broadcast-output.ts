#!/usr/bin/env tsx
/**
 * Validator for ship-broadcast agent output.
 *
 * Mirrors the Python `validate_output` in scripts/broadcast-agent.py so
 * CI (and any TS-side consumer) can validate broadcast JSON without a
 * Python toolchain. The two implementations must stay in sync — the
 * prompt's "Output schema" section is the contract both enforce.
 *
 * Usage:
 *   tsx scripts/validate-broadcast-output.ts path/to/output.json
 *   echo '{...}' | tsx scripts/validate-broadcast-output.ts -
 *
 * Exits 0 when the input is a valid object, 1 when invalid.
 */

import { readFileSync } from "node:fs";

const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  farcaster: 320,
  telegram: 4096,
  linkedin: 3000,
};

const ALLOWED_VISUAL_SOURCES = new Set([
  "silicon",
  "screen-studio",
  "remotion-reel",
  "skip",
]);

type Json = unknown;

class ValidationError extends Error {}

function isObject(v: Json): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isInt(v: Json): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

export function validate(payload: Json): void {
  if (!isObject(payload)) {
    throw new ValidationError(
      `top-level must be an object, got ${Array.isArray(payload) ? "array" : typeof payload}`,
    );
  }

  const required = [
    "ship_worthy",
    "skip_reason",
    "x",
    "farcaster",
    "telegram",
    "linkedin",
    "visual",
    "self_check",
  ];
  const missing = required.filter((k) => !(k in payload));
  if (missing.length > 0) {
    throw new ValidationError(`missing top-level keys: ${JSON.stringify(missing)}`);
  }

  if (typeof payload.ship_worthy !== "boolean") {
    throw new ValidationError("ship_worthy must be boolean");
  }
  const sw = payload.ship_worthy;
  const sr = payload.skip_reason;
  if (sw && sr !== null) {
    throw new ValidationError("ship_worthy=true requires skip_reason=null");
  }
  if (!sw && (typeof sr !== "string" || sr.trim() === "")) {
    throw new ValidationError("ship_worthy=false requires a non-empty skip_reason");
  }

  let drafted = 0;
  for (const [platform, limit] of Object.entries(PLATFORM_LIMITS)) {
    const entry = payload[platform];
    if (entry === null) continue;
    if (!sw) {
      throw new ValidationError(`ship_worthy=false but ${platform} draft is not null`);
    }
    if (!isObject(entry)) {
      throw new ValidationError(`${platform} must be object or null`);
    }
    const text = entry.text;
    const charCount = entry.char_count;
    if (typeof text !== "string" || text.trim() === "") {
      throw new ValidationError(`${platform}.text must be a non-empty string`);
    }
    if (!isInt(charCount)) {
      throw new ValidationError(`${platform}.char_count must be an integer`);
    }
    const actual = text.length;
    if (actual > limit) {
      throw new ValidationError(
        `${platform} text exceeds ${limit} char limit (got ${actual})`,
      );
    }
    // char_count is model-reported and the model can miscount by a
    // few chars. The orchestrator overwrites it with the true length
    // before persisting the draft.
    drafted += 1;
  }

  const visual = payload.visual;
  if (!isObject(visual)) {
    throw new ValidationError("visual must be an object");
  }
  const src = visual.source;
  if (typeof src !== "string") {
    throw new ValidationError("visual.source must be a string");
  }
  if (!(ALLOWED_VISUAL_SOURCES.has(src) || src.startsWith("vhs:"))) {
    throw new ValidationError(
      `visual.source must be one of ${[...ALLOWED_VISUAL_SOURCES].sort()} or vhs:<tape>; got ${JSON.stringify(src)}`,
    );
  }
  if (typeof visual.rationale !== "string" || visual.rationale.trim() === "") {
    throw new ValidationError("visual.rationale must be a non-empty string");
  }

  const sc = payload.self_check;
  if (!isObject(sc)) {
    throw new ValidationError("self_check must be an object");
  }
  for (const k of [
    "vocabulary_ok",
    "no_unshipped_claims",
    "char_counts_accurate",
    "platforms_drafted",
  ]) {
    if (!(k in sc)) {
      throw new ValidationError(`self_check missing key: ${k}`);
    }
  }
  if (!isInt(sc.platforms_drafted)) {
    throw new ValidationError("self_check.platforms_drafted must be an integer");
  }
  if (sc.platforms_drafted !== drafted) {
    throw new ValidationError(
      `self_check.platforms_drafted=${sc.platforms_drafted} but ${drafted} drafts present`,
    );
  }
}

function readInput(): string {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: validate-broadcast-output.ts <path|-> ");
    process.exit(2);
  }
  if (arg === "-") {
    return readFileSync(0, "utf8");
  }
  return readFileSync(arg, "utf8");
}

if (
  // Run as a CLI only when invoked directly. Tolerate either tsx or node.
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("validate-broadcast-output.ts")
) {
  try {
    const raw = readInput();
    const data = JSON.parse(raw);
    validate(data);
    console.log("OK");
  } catch (e) {
    if (e instanceof ValidationError) {
      console.error(`invalid: ${e.message}`);
    } else if (e instanceof SyntaxError) {
      console.error(`invalid: not valid JSON: ${e.message}`);
    } else {
      console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
    process.exit(1);
  }
}
