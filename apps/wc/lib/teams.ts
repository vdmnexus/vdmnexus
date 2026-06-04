// Squad knowledge base. Each content/squads/<GROUP>.json is keyed by the same
// team slug slugifyTeam() produces, so squads join cleanly to the model board
// and fixtures. Transcribed from the official squad announcements.
import fs from "node:fs";
import path from "node:path";
import A from "../content/squads/A.json";
import B from "../content/squads/B.json";
import C from "../content/squads/C.json";
import D from "../content/squads/D.json";
import E from "../content/squads/E.json";
import F from "../content/squads/F.json";
import G from "../content/squads/G.json";
import H from "../content/squads/H.json";
import I from "../content/squads/I.json";
import J from "../content/squads/J.json";
import K from "../content/squads/K.json";
import L from "../content/squads/L.json";

export type Player = { name: string; club: string };

export type Position = "Goalkeepers" | "Defenders" | "Midfielders" | "Forwards";

export type TeamData = {
  name: string;
  display?: string;
  group: string;
  announced: string;
  manager: string;
  squad: Record<Position, Player[]>;
};

const teams = {
  ...A,
  ...B,
  ...C,
  ...D,
  ...E,
  ...F,
  ...G,
  ...H,
  ...I,
  ...J,
  ...K,
  ...L,
} as Record<string, TeamData>;

export const positionOrder: Position[] = [
  "Goalkeepers",
  "Defenders",
  "Midfielders",
  "Forwards",
];

export function teamBySlug(slug: string): TeamData | undefined {
  return teams[slug];
}

export function allTeamSlugs(): string[] {
  return Object.keys(teams);
}

export function squadSize(t: TeamData): number {
  return positionOrder.reduce((n, pos) => n + t.squad[pos].length, 0);
}

// Editorial per-team knowledge base — DISPLAY ONLY, never a model input.
// Drop a content/teams/<slug>.json file (slug = the team's URL slug) and it
// renders on /team/[slug]. Every field is optional; see content/teams/_template.json.
// Display-only style tag, never a model input (per PIPELINE.md the gated
// heat×counter experiment needs point-in-time 2018/2022 ratings, which this is
// not — these are 2026-only scouting reads).
export type CounterReliance = {
  tier: "high" | "medium" | "low";
  note?: string;
};

export type TeamKnowledge = {
  summary?: string;
  style?: string;
  counterReliance?: CounterReliance;
  strengths?: string[];
  weaknesses?: string[];
  keyPlayers?: { name: string; role?: string; note?: string }[];
  tactics?: string;
  mismatch?: string;
  xFactor?: string;
  notes?: string[];
  sources?: string[];
  updated?: string;
};

const knowledgeDir = path.join(process.cwd(), "content/teams");

export function teamKnowledge(slug: string): TeamKnowledge | undefined {
  try {
    const raw = fs.readFileSync(path.join(knowledgeDir, `${slug}.json`), "utf8");
    return JSON.parse(raw) as TeamKnowledge;
  } catch {
    return undefined;
  }
}
