#!/usr/bin/env node
/**
 * copy-lint — greps apps/web user-facing source for banned marketing
 * patterns per docs/VOICE.md. Exits non-zero on any match.
 *
 * Scope: .tsx files under apps/web/app and apps/web/components — that's
 * where user-facing strings live. Deliberately pragmatic: it scans whole
 * lines (including comments) because the cost of a false positive is a
 * one-line allowlist entry, while a missed banned phrase ships to prod.
 *
 * Allowlisting: technical usages that legitimately collide with a banned
 * word (token vesting "unlocks", Uniswap v4 PoolManager `unlock`) are
 * excused via ALLOW patterns below. Add the narrowest pattern that works.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const ROOTS = ["apps/web/app", "apps/web/components"];

/** Banned patterns, case-insensitive. Keep in sync with docs/VOICE.md. */
const BANNED = [
  { re: /\bseamless(?:ly)?\b/i, why: "banned word (VOICE.md)" },
  { re: /\beffortless(?:ly)?\b/i, why: "banned word (VOICE.md)" },
  { re: /\bsupercharg\w*/i, why: "banned word (VOICE.md)" },
  { re: /\bcutting[- ]edge\b/i, why: "banned word (VOICE.md)" },
  { re: /\brevolutioni[sz]\w*/i, why: "banned word (VOICE.md)" },
  { re: /\bgame[- ]chang\w*/i, why: "banned word (VOICE.md)" },
  { re: /\bempower\w*/i, why: "banned word (VOICE.md)" },
  { re: /\brobust\b/i, why: "banned word (VOICE.md)" },
  { re: /say goodbye/i, why: "banned phrase (VOICE.md)" },
  { re: /welcome to the future/i, why: "banned phrase (VOICE.md)" },
  // "isn't just X — it's Y" in its common apostrophe encodings.
  { re: /\bisn(?:'|’|&apos;)?t just\b/i, why: "banned construction (VOICE.md)" },
  { re: /get started today/i, why: "banned CTA (VOICE.md)" },
  // Marketing "unlock": "unlock the/your/new possibilities". Technical
  // vesting/AMM unlocks ("daily unlock", "Unlocks trust badge", "token
  // unlock", PoolManager unlock) do not match this shape.
  { re: /\bunlock(?:s|ing)? (?:the|your|new|a world)\b/i, why: "marketing 'unlock' (VOICE.md)" },
];

/**
 * Line-level allowlist: if a banned pattern matched but one of these also
 * matches the same line, the line is excused. Keep entries narrow and
 * commented.
 */
const ALLOW = [
  // (none yet — add narrowest-possible patterns here when a technical
  // usage collides with a banned word)
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      yield* walk(p);
    } else if (entry.name.endsWith(".tsx")) {
      yield p;
    }
  }
}

const failures = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const { re, why } of BANNED) {
        if (re.test(line) && !ALLOW.some((a) => a.test(line))) {
          failures.push(
            `${relative(process.cwd(), file)}:${i + 1} — ${why}\n    ${line.trim().slice(0, 160)}`
          );
        }
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`copy-lint: ${failures.length} banned pattern(s) found:\n`);
  for (const f of failures) console.error(f);
  console.error("\nSee docs/VOICE.md. Rewrite the copy or add a narrow ALLOW entry.");
  process.exit(1);
}
console.log("copy-lint: clean");
