-- Marburg Cricket Club — Phase 2 schema
-- Run this in your external Supabase project's SQL Editor.
-- Idempotent: safe to re-run.

-- ============== ROLES ==============
do $$ begin
  create type public.app_role as enum ('admin','captain','player');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

drop policy if exists "read own roles" on public.user_roles;
create policy "read own roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
drop policy if exists "admin manage roles" on public.user_roles;
create policy "admin manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin'));

-- ============== PROFILES ==============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles for all using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'player') on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============== TEAMS / PLAYERS ==============
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null, short_name text, slug text unique,
  category text, badge_url text, home_ground text, founded_year int,
  description text, captain_id uuid, vice_captain_id uuid,
  is_active boolean default true, created_at timestamptz default now()
);
alter table public.teams enable row level security;
drop policy if exists "teams read" on public.teams;
create policy "teams read" on public.teams for select using (true);
drop policy if exists "teams admin write" on public.teams;
create policy "teams admin write" on public.teams for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null, dob date, role text,
  batting_style text, bowling_style text, jersey_number int,
  phone text, email text, photo_url text, bio text,
  is_active boolean default true, created_at timestamptz default now()
);
alter table public.players enable row level security;
drop policy if exists "players read" on public.players;
create policy "players read" on public.players for select using (true);
drop policy if exists "players update own" on public.players;
create policy "players update own" on public.players for update using (auth.uid() = user_id);
drop policy if exists "players admin write" on public.players;
create policy "players admin write" on public.players for all using (public.has_role(auth.uid(),'admin'));

-- Add FKs for captain/vice now that players exists.
do $$ begin
  alter table public.teams add constraint teams_captain_id_fkey foreign key (captain_id) references public.players(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.teams add constraint teams_vice_captain_id_fkey foreign key (vice_captain_id) references public.players(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.team_players (
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  jersey_no int, joined_at timestamptz default now(),
  primary key (team_id, player_id)
);
alter table public.team_players enable row level security;
drop policy if exists "tp read" on public.team_players;
create policy "tp read" on public.team_players for select using (true);
drop policy if exists "tp admin write" on public.team_players;
create policy "tp admin write" on public.team_players for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.player_stats (
  player_id uuid primary key references public.players(id) on delete cascade,
  matches int default 0, innings int default 0, runs int default 0, balls_faced int default 0,
  highest_score int default 0, average numeric default 0, strike_rate numeric default 0,
  fifties int default 0, hundreds int default 0,
  wickets int default 0, overs numeric default 0, runs_conceded int default 0,
  bowling_avg numeric default 0, economy numeric default 0,
  catches int default 0, run_outs int default 0, stumpings int default 0
);
alter table public.player_stats enable row level security;
drop policy if exists "ps read" on public.player_stats;
create policy "ps read" on public.player_stats for select using (true);
drop policy if exists "ps admin write" on public.player_stats;
create policy "ps admin write" on public.player_stats for all using (public.has_role(auth.uid(),'admin'));

-- ============== TOURNAMENTS / MATCHES ==============
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null, format text default 'league', status text default 'upcoming',
  start_date date, end_date date, venue text, banner_url text,
  description text, rules text, prize_info text, created_at timestamptz default now()
);
alter table public.tournaments enable row level security;
drop policy if exists "t read" on public.tournaments;
create policy "t read" on public.tournaments for select using (true);
drop policy if exists "t admin" on public.tournaments;
create policy "t admin" on public.tournaments for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.tournament_teams (
  tournament_id uuid references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  primary key (tournament_id, team_id)
);
alter table public.tournament_teams enable row level security;
drop policy if exists "tt read" on public.tournament_teams;
create policy "tt read" on public.tournament_teams for select using (true);
drop policy if exists "tt admin" on public.tournament_teams;
create policy "tt admin" on public.tournament_teams for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.points_table (
  tournament_id uuid references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  played int default 0, won int default 0, lost int default 0, no_result int default 0,
  points int default 0, nrr numeric default 0,
  primary key (tournament_id, team_id)
);
alter table public.points_table enable row level security;
drop policy if exists "pt read" on public.points_table;
create policy "pt read" on public.points_table for select using (true);
drop policy if exists "pt admin" on public.points_table;
create policy "pt admin" on public.points_table for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  team_a uuid references public.teams(id), team_b uuid references public.teams(id),
  match_date timestamptz, venue text, overs int default 20, match_type text default 'T20',
  status text default 'scheduled',
  winner_id uuid references public.teams(id), result_description text,
  man_of_match_id uuid references public.players(id),
  score_a text, score_b text, created_at timestamptz default now()
);
alter table public.matches enable row level security;
drop policy if exists "m read" on public.matches;
create policy "m read" on public.matches for select using (true);
drop policy if exists "m admin" on public.matches;
create policy "m admin" on public.matches for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.player_availability (
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  available boolean default true, updated_at timestamptz default now(),
  primary key (match_id, player_id)
);
alter table public.player_availability enable row level security;
drop policy if exists "pa read" on public.player_availability;
create policy "pa read" on public.player_availability for select using (true);
drop policy if exists "pa own" on public.player_availability;
create policy "pa own" on public.player_availability for all using (
  exists (select 1 from public.players p where p.id = player_id and p.user_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);

create table if not exists public.batting_scorecards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id),
  runs int default 0, balls int default 0, fours int default 0, sixes int default 0,
  dismissal text, created_at timestamptz default now()
);
alter table public.batting_scorecards enable row level security;
drop policy if exists "bs read" on public.batting_scorecards;
create policy "bs read" on public.batting_scorecards for select using (true);
drop policy if exists "bs admin" on public.batting_scorecards;
create policy "bs admin" on public.batting_scorecards for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.bowling_scorecards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id),
  overs numeric default 0, maidens int default 0, runs int default 0,
  wickets int default 0, economy numeric default 0, created_at timestamptz default now()
);
alter table public.bowling_scorecards enable row level security;
drop policy if exists "bw read" on public.bowling_scorecards;
create policy "bw read" on public.bowling_scorecards for select using (true);
drop policy if exists "bw admin" on public.bowling_scorecards;
create policy "bw admin" on public.bowling_scorecards for all using (public.has_role(auth.uid(),'admin'));

-- ============== SHOP ==============
create table if not exists public.product_categories (id uuid primary key default gen_random_uuid(), name text not null, slug text unique);
alter table public.product_categories enable row level security;
drop policy if exists "pc read" on public.product_categories;
create policy "pc read" on public.product_categories for select using (true);
drop policy if exists "pc admin" on public.product_categories;
create policy "pc admin" on public.product_categories for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null, slug text, description text,
  price numeric not null default 0, sale_price numeric, sku text,
  stock int default 0, images jsonb default '[]'::jsonb,
  is_active boolean default true, created_at timestamptz default now()
);
alter table public.products enable row level security;
drop policy if exists "pr read" on public.products;
create policy "pr read" on public.products for select using (true);
drop policy if exists "pr admin" on public.products;
create policy "pr admin" on public.products for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  size text, color text, stock int default 0, price_modifier numeric default 0
);
alter table public.product_variants enable row level security;
drop policy if exists "pv read" on public.product_variants;
create policy "pv read" on public.product_variants for select using (true);
drop policy if exists "pv admin" on public.product_variants;
create policy "pv admin" on public.product_variants for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating int check (rating between 1 and 5), comment text, created_at timestamptz default now()
);
alter table public.product_reviews enable row level security;
drop policy if exists "prv read" on public.product_reviews;
create policy "prv read" on public.product_reviews for select using (true);
drop policy if exists "prv own write" on public.product_reviews;
create policy "prv own write" on public.product_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  total numeric default 0, status text default 'pending',
  payment_status text default 'pending', payment_method text, payment_reference text,
  shipping jsonb, created_at timestamptz default now()
);
alter table public.orders enable row level security;
drop policy if exists "ord own read" on public.orders;
create policy "ord own read" on public.orders for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
drop policy if exists "ord insert own" on public.orders;
create policy "ord insert own" on public.orders for insert with check (auth.uid() = user_id);
drop policy if exists "ord admin" on public.orders;
create policy "ord admin" on public.orders for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id), variant_id uuid references public.product_variants(id),
  qty int default 1, unit_price numeric default 0, name text, image text
);
alter table public.order_items enable row level security;
drop policy if exists "oi read" on public.order_items;
create policy "oi read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
drop policy if exists "oi insert" on public.order_items;
create policy "oi insert" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- ============== NOTIFICATIONS ==============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null, message text not null, type text default 'info',
  target jsonb, scheduled_at timestamptz, sent_at timestamptz, created_at timestamptz default now()
);
alter table public.notifications enable row level security;
drop policy if exists "n read" on public.notifications;
create policy "n read" on public.notifications for select using (true);
drop policy if exists "n admin" on public.notifications;
create policy "n admin" on public.notifications for all using (public.has_role(auth.uid(),'admin'));

create table if not exists public.player_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  read_at timestamptz, created_at timestamptz default now()
);
alter table public.player_notifications enable row level security;
drop policy if exists "pn read" on public.player_notifications;
create policy "pn read" on public.player_notifications for select using (
  exists (select 1 from public.players p where p.id = player_id and p.user_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
drop policy if exists "pn admin" on public.player_notifications;
create policy "pn admin" on public.player_notifications for all using (public.has_role(auth.uid(),'admin'));

-- ============== CONTACT MESSAGES ==============
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text, email text, phone text, subject text, message text, created_at timestamptz default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists "cm insert anon" on public.contact_messages;
create policy "cm insert anon" on public.contact_messages for insert with check (true);
drop policy if exists "cm admin read" on public.contact_messages;
create policy "cm admin read" on public.contact_messages for select using (public.has_role(auth.uid(),'admin'));

-- ============== STORAGE BUCKETS ==============
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true),
  ('team-badges','team-badges',true),
  ('tournament-banners','tournament-banners',true),
  ('product-images','product-images',true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects for select using (
  bucket_id in ('avatars','team-badges','tournament-banners','product-images')
);
drop policy if exists "auth upload media" on storage.objects;
create policy "auth upload media" on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars','team-badges','tournament-banners','product-images')
);
drop policy if exists "auth update media" on storage.objects;
create policy "auth update media" on storage.objects for update to authenticated using (
  bucket_id in ('avatars','team-badges','tournament-banners','product-images')
);
