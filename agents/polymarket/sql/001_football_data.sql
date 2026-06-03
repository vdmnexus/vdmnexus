-- Football data store for the 2026 World Cup model.
--
-- Three tables, all service-role only (RLS on, no policies) — mirrors the
-- vdmnexus agent-rail convention. Nothing here is read by the anon key.
--
--   football_matches        the martj42 spine: every international ever, incl.
--                           friendlies + every 2026 WC fixture (scores fill in
--                           after each match). Source of "last N matches per
--                           national team" and the WC results feed.
--   wc_standings            group table, recomputed from played WC group games
--                           on every ingest.
--   fotmob_match_snapshots  append-only time series of live score + implied
--                           odds + xG captured from Fotmob during match days.
--
-- Apply with: supabase db execute < sql/001_football_data.sql
--   (or paste into the Supabase SQL editor).

create table if not exists public.football_matches (
  match_date  date    not null,
  home_team   text    not null,
  away_team   text    not null,
  home_score  int,
  away_score  int,
  tournament  text    not null,
  city        text,
  country     text,
  neutral     boolean not null default false,
  status      text    not null default 'scheduled',  -- scheduled | played
  source      text    not null default 'martj42',
  updated_at  timestamptz not null default now(),
  primary key (match_date, home_team, away_team)
);

create index if not exists football_matches_home_idx
  on public.football_matches (home_team, match_date desc);
create index if not exists football_matches_away_idx
  on public.football_matches (away_team, match_date desc);
create index if not exists football_matches_tournament_idx
  on public.football_matches (tournament, match_date desc);

create table if not exists public.wc_standings (
  grp         text not null,
  team        text not null,
  played      int  not null default 0,
  won         int  not null default 0,
  drawn       int  not null default 0,
  lost        int  not null default 0,
  gf          int  not null default 0,
  ga          int  not null default 0,
  gd          int  not null default 0,
  points      int  not null default 0,
  rank        int,
  updated_at  timestamptz not null default now(),
  primary key (grp, team)
);

create table if not exists public.fotmob_match_snapshots (
  id          bigint generated always as identity primary key,
  match_id    text        not null,            -- fotmob match id
  captured_at timestamptz not null default now(),
  home_team   text,
  away_team   text,
  home_score  int,
  away_score  int,
  status      text,                            -- pre | live | ft
  minute      int,
  prob_home   numeric,                         -- implied win prob from odds
  prob_draw   numeric,
  prob_away   numeric,
  xg_home     numeric,
  xg_away     numeric,
  raw         jsonb                            -- full payload for later mining
);

create index if not exists fotmob_snap_match_idx
  on public.fotmob_match_snapshots (match_id, captured_at desc);

alter table public.football_matches       enable row level security;
alter table public.wc_standings           enable row level security;
alter table public.fotmob_match_snapshots enable row level security;
-- No policies: only the service role touches these, server-side.

-- Convenience: last N matches for any national team is just a query, e.g.
--   select * from public.football_matches
--   where home_team = 'France' or away_team = 'France'
--   order by match_date desc limit 5;
