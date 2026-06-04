// Squad knowledge base. Each content/squads/<GROUP>.json is keyed by the same
// team slug slugifyTeam() produces, so squads join cleanly to the model board
// and fixtures. Transcribed from the official squad announcements.
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
