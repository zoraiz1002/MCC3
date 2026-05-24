-- Phase 2.5 — Live scoring schema.
-- Idempotent. Run this in your Supabase SQL editor AFTER 0001_phase2.sql.

-- Toss + extras on matches
alter table public.matches add column if not exists toss_winner_id uuid references public.teams(id);
alter table public.matches add column if not exists toss_decision text; -- 'bat' | 'bowl'

-- Innings (one row per innings in a match)
create table if not exists public.innings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  innings_no int not null,
  batting_team_id uuid not null references public.teams(id),
  bowling_team_id uuid not null references public.teams(id),
  runs int default 0,
  wickets int default 0,
  overs numeric default 0,
  balls int default 0,
  is_closed boolean default false,
  created_at timestamptz default now(),
  unique (match_id, innings_no)
);
alter table public.innings enable row level security;
drop policy if exists "innings read" on public.innings;
create policy "innings read" on public.innings for select using (true);
drop policy if exists "innings write" on public.innings;
create policy "innings write" on public.innings for all using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'captain')
);

-- Ball-by-ball log
create table if not exists public.balls (
  id uuid primary key default gen_random_uuid(),
  innings_id uuid not null references public.innings(id) on delete cascade,
  over_no int not null,
  ball_no int not null,
  batsman_id uuid references public.players(id),
  non_striker_id uuid references public.players(id),
  bowler_id uuid references public.players(id),
  runs int default 0,                -- batter runs (excludes extras)
  extras_type text,                  -- 'wide' | 'noball' | 'bye' | 'legbye' | null
  extras_runs int default 0,
  is_wicket boolean default false,
  dismissal_type text,               -- 'bowled'|'caught'|'lbw'|'runout'|'stumped'|'hitwicket'
  out_player_id uuid references public.players(id),
  new_batsman_id uuid references public.players(id),
  created_at timestamptz default now()
);
alter table public.balls enable row level security;
drop policy if exists "balls read" on public.balls;
create policy "balls read" on public.balls for select using (true);
drop policy if exists "balls write" on public.balls;
create policy "balls write" on public.balls for all using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'captain')
);

-- Allow captains to manage batting/bowling scorecards
drop policy if exists "bs captain write" on public.batting_scorecards;
create policy "bs captain write" on public.batting_scorecards for all using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'captain')
);
drop policy if exists "bw captain write" on public.bowling_scorecards;
create policy "bw captain write" on public.bowling_scorecards for all using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'captain')
);
-- Allow captains to schedule matches and update during live scoring
drop policy if exists "m captain write" on public.matches;
create policy "m captain write" on public.matches for all using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'captain')
);
