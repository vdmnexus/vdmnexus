import fs from "node:fs/promises";
import path from "node:path";

export type BroadcastPlatform = "x" | "farcaster" | "telegram" | "linkedin";

export type BroadcastDraft = {
  platform: BroadcastPlatform;
  /** Display label, e.g. "X (Twitter)". */
  label: string;
  /** Raw draft text exactly as authored. */
  text: string;
  /** Character count of `text`. */
  chars: number;
  /** Soft character limit for this platform. */
  limit: number;
};

export type Broadcast = {
  /** Slug = filename without .md, e.g. "65-66-python-sdk-x402-mainnet". */
  slug: string;
  /** H1 from the file. */
  title: string;
  /** Type prefix metadata (feat / fix / chore / etc), if present. */
  type: string | null;
  /** Linked PR numbers extracted from the "Linked PR(s)" metadata. */
  linkedPrs: number[];
  /** "Drafted" line — usually "YYYY-MM-DD by ...". */
  drafted: string | null;
  /** "Status" line — "in review", "scheduled", "posted", etc. */
  status: string | null;
  /** Path to a rendered visual companion under `marketing/media/out/`,
   * if the draft footer's `## Visual` section references one. */
  visualPath: string | null;
  /** Last-modified timestamp from the filesystem. */
  updatedAt: number;
  drafts: BroadcastDraft[];
};

const PLATFORM_LIMITS: Record<BroadcastPlatform, number> = {
  x: 280,
  farcaster: 320,
  telegram: 4096,
  linkedin: 3000,
};

const PLATFORM_PATTERNS: { platform: BroadcastPlatform; label: string; re: RegExp }[] = [
  { platform: "x", label: "X (Twitter)", re: /^##\s+X(\s|$|\s*\()/i },
  { platform: "farcaster", label: "Farcaster", re: /^##\s+Farcaster/i },
  { platform: "telegram", label: "Telegram", re: /^##\s+Telegram/i },
  { platform: "linkedin", label: "LinkedIn", re: /^##\s+LinkedIn/i },
];

/** Locate the `marketing/broadcasts/` directory by walking up from the
 *  apps/web build root. Works both in dev (running from apps/web) and in
 *  production (where next.config.js sets `outputFileTracingRoot` to the
 *  monorepo root so the files are bundled with the deployment). */
function broadcastsDir(): string {
  // process.cwd() at request time is the deployment root. In dev that's
  // apps/web; in prod (with outputFileTracingRoot) it's the repo root.
  const candidates = [
    path.join(process.cwd(), "marketing", "broadcasts"),
    path.join(process.cwd(), "..", "..", "marketing", "broadcasts"),
  ];
  for (const c of candidates) {
    try {
      // We don't await here because this returns a candidate. The actual
      // existence is checked by `listBroadcastSlugs`.
      return c;
    } catch {
      // ignore
    }
  }
  return candidates[0];
}

async function resolveDir(): Promise<string | null> {
  const tries = [
    path.join(process.cwd(), "marketing", "broadcasts"),
    path.join(process.cwd(), "..", "..", "marketing", "broadcasts"),
  ];
  for (const t of tries) {
    try {
      const st = await fs.stat(t);
      if (st.isDirectory()) return t;
    } catch {
      // try next
    }
  }
  return null;
}

export async function listBroadcasts(): Promise<Broadcast[]> {
  const dir = await resolveDir();
  if (!dir) return [];

  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  const out: Broadcast[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    try {
      const raw = await fs.readFile(full, "utf-8");
      const stat = await fs.stat(full);
      out.push(parseBroadcast(file, raw, stat.mtimeMs));
    } catch {
      // skip unreadable files
    }
  }
  // Newest first.
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export async function getBroadcast(slug: string): Promise<Broadcast | null> {
  const dir = await resolveDir();
  if (!dir) return null;
  const full = path.join(dir, `${slug}.md`);
  try {
    const raw = await fs.readFile(full, "utf-8");
    const stat = await fs.stat(full);
    return parseBroadcast(`${slug}.md`, raw, stat.mtimeMs);
  } catch {
    return null;
  }
}

function parseBroadcast(file: string, raw: string, mtimeMs: number): Broadcast {
  const slug = file.replace(/\.md$/, "");
  const lines = raw.split("\n");

  let title = slug;
  let type: string | null = null;
  let drafted: string | null = null;
  let status: string | null = null;
  const linkedPrs: number[] = [];
  let visualPath: string | null = null;

  for (const line of lines) {
    if (!title.includes(" ") && line.startsWith("# ")) {
      title = line.slice(2).trim();
    } else if (line.startsWith("# ")) {
      // First H1 wins.
      if (title === slug) title = line.slice(2).trim();
    }

    const meta = line.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
    if (meta) {
      const key = meta[1].trim().toLowerCase();
      const val = meta[2].trim();
      if (key === "type") type = val;
      else if (key === "drafted") drafted = val;
      else if (key === "status") status = val;
      else if (key.startsWith("linked pr")) {
        const nums = val.match(/#(\d+)/g);
        if (nums) {
          for (const n of nums) linkedPrs.push(parseInt(n.slice(1), 10));
        }
      }
    }

    const visualMatch = line.match(/marketing\/media\/out\/([\w.\-]+\.(gif|mp4|webm|png|jpg))/);
    if (visualMatch && !visualPath) {
      visualPath = `marketing/media/out/${visualMatch[1]}`;
    }
  }

  const drafts: BroadcastDraft[] = [];
  for (const pat of PLATFORM_PATTERNS) {
    const text = extractPlatformDraft(lines, pat.re);
    if (text != null) {
      drafts.push({
        platform: pat.platform,
        label: pat.label,
        text,
        chars: text.length,
        limit: PLATFORM_LIMITS[pat.platform],
      });
    }
  }

  return {
    slug,
    title,
    type,
    linkedPrs,
    drafted,
    status,
    visualPath,
    updatedAt: mtimeMs,
    drafts,
  };
}

/** Within a platform section (between `## <Platform>` and the next H2),
 *  pull the first fenced code block. That's the convention used in
 *  `marketing/ship-broadcast.md` — each platform draft sits inside its
 *  own code fence. */
function extractPlatformDraft(lines: string[], headingRe: RegExp): string | null {
  let inSection = false;
  let inFence = false;
  let fenceMarker: string | null = null;
  const buf: string[] = [];

  for (const line of lines) {
    if (!inSection) {
      if (headingRe.test(line)) {
        inSection = true;
      }
      continue;
    }

    // Next H2 ends the section.
    if (/^##\s/.test(line) && !inFence) {
      break;
    }

    if (!inFence) {
      const open = line.match(/^(```+)(\w*)/);
      if (open) {
        inFence = true;
        fenceMarker = open[1];
      }
      continue;
    }

    if (fenceMarker && line.startsWith(fenceMarker)) {
      return buf.join("\n").trim();
    }
    buf.push(line);
  }

  // Reached end of file inside a fence — return what we have.
  if (buf.length > 0) return buf.join("\n").trim();
  return null;
}

export function intentUrl(platform: BroadcastPlatform, text: string): string | null {
  if (platform === "x") {
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }
  return null;
}
