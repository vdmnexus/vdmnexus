// Typed access to the canonical model snapshots produced by
// agents/polymarket/export_scores.py + export_tournament.py and committed to
// agents/polymarket/exports/ by the daily football-ingest GitHub Action.
// Both this app and the marketing /wc26 route import these same files, so the
// data never forks.
import scoresJson from "../../../agents/polymarket/exports/scores.json";
import tournamentJson from "../../../agents/polymarket/exports/tournament.json";

export type Fixture = {
  home: string;
  away: string;
  city: string;
  pick: string;
  modal: string;
  ev: number;
  xg: [number, number];
  wdl: [number, number, number];
  top: [string, number][];
};

export type Group = { group: string; fixtures: Fixture[] };

export type Scores = {
  generated_at: string;
  scoring: { exact: number; gdiff: number; tend: number };
  features: string;
  groups: Group[];
};

export type TeamRow = {
  team: string;
  group: string;
  win_group: number;
  adv: number;
  r16: number;
  qf: number;
  sf: number;
  final: number;
  champ: number;
  market: number | null;
  edge: number | null;
};

export type Tournament = {
  generated_at: string;
  n_sims: number;
  group_games_played: number;
  features: string;
  board: TeamRow[];
};

export const scores = scoresJson as Scores;
export const tournament = tournamentJson as Tournament;

// --- slugs (stable URL ids for teams) --------------------------------------

export function slugifyTeam(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- match ids (stable URL ids for fixtures) -------------------------------
// `${group}-${index}` over the order fixtures appear in scores.json.

export function matchId(group: string, index: number): string {
  return `${group}-${index}`;
}

export type FixtureRef = { id: string; group: string; index: number; fixture: Fixture };

export function allFixtures(): FixtureRef[] {
  const out: FixtureRef[] = [];
  for (const g of scores.groups) {
    g.fixtures.forEach((fixture, index) => {
      out.push({ id: matchId(g.group, index), group: g.group, index, fixture });
    });
  }
  return out;
}

export function fixtureById(id: string): FixtureRef | undefined {
  return allFixtures().find((f) => f.id === id);
}

export function fixturesForTeam(team: string): FixtureRef[] {
  return allFixtures().filter(
    (f) => f.fixture.home === team || f.fixture.away === team,
  );
}

// --- board lookups ---------------------------------------------------------

export function boardRow(team: string): TeamRow | undefined {
  return tournament.board.find((r) => r.team === team);
}

const boardBySlug = new Map(
  tournament.board.map((r) => [slugifyTeam(r.team), r]),
);

export function boardRowBySlug(slug: string): TeamRow | undefined {
  return boardBySlug.get(slug);
}

// --- projected group standings ---------------------------------------------
// Pre-tournament (group_games_played === 0) this is a model projection:
// expected points and expected goals summed across each team's three group
// fixtures, using the per-fixture W/D/L and xG. As real results land the
// snapshot's wdl collapses toward 100/0/0 on played games, so the same
// derivation tracks the live table.

export type StandingRow = {
  team: string;
  slug: string;
  played: number;
  xPts: number;
  xGF: number;
  xGA: number;
  winGroup: number; // share of sims won the group
  adv: number; // share of sims advanced
};

export function standingsForGroup(group: string): StandingRow[] {
  const g = scores.groups.find((x) => x.group === group);
  if (!g) return [];

  const acc = new Map<string, { xPts: number; xGF: number; xGA: number }>();
  const bump = (team: string, pts: number, gf: number, ga: number) => {
    const cur = acc.get(team) ?? { xPts: 0, xGF: 0, xGA: 0 };
    cur.xPts += pts;
    cur.xGF += gf;
    cur.xGA += ga;
    acc.set(team, cur);
  };

  for (const f of g.fixtures) {
    const [w, d, l] = f.wdl; // percentages, home perspective
    const [hxg, axg] = f.xg;
    bump(f.home, (3 * w + 1 * d) / 100, hxg, axg);
    bump(f.away, (3 * l + 1 * d) / 100, axg, hxg);
  }

  return [...acc.entries()]
    .map(([team, v]) => {
      const row = boardRow(team);
      return {
        team,
        slug: slugifyTeam(team),
        played: 3,
        xPts: v.xPts,
        xGF: v.xGF,
        xGA: v.xGA,
        winGroup: row?.win_group ?? 0,
        adv: row?.adv ?? 0,
      };
    })
    .sort((a, b) => b.xPts - a.xPts || b.xGF - b.xGA - (a.xGF - a.xGA));
}

export const groupLetters = scores.groups.map((g) => g.group);

export const pct = (x: number) => `${(x * 100).toFixed(1)}`;
