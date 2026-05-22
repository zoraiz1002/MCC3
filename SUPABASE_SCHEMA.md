# Marburg Cricket Club — Supabase Schema (proposal)

Frontend is fully wired to `@supabase/supabase-js`. Provide
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time.

## Tables

### profiles
- id (uuid, PK, references auth.users)
- name (text)
- phone (text, nullable)
- avatar_url (text, nullable)
- dob (date, nullable)
- nationality (text, nullable)
- batting_style (text)  -- "RHB" | "LHB"
- bowling_style (text)  -- "RF","RM","LF","RO","LO" etc.
- created_at (timestamptz default now())

### user_roles  (DO NOT store roles on profiles)
- id (uuid PK)
- user_id (uuid → auth.users on delete cascade)
- role (app_role enum: 'admin' | 'captain' | 'player')
- unique (user_id, role)

### teams
- id (uuid PK), name, slug, category, badge_url, home_ground
- captain_id, vice_captain_id (→ profiles)

### team_players
- team_id, player_id, jersey_no, joined_at  (composite PK: team_id, player_id)

### tournaments
- id, name, format ('league'|'knockout'|'hybrid'), status, start_date, end_date,
  venue, banner_url, description, rules, prize_info

### tournament_teams
- tournament_id, team_id, played, won, lost, no_result, points, nrr

### matches
- id, tournament_id, team_a, team_b, scheduled_at, venue,
  status ('upcoming'|'live'|'completed'),
  toss_winner, toss_decision, motm_player_id

### innings
- id, match_id, batting_team, bowling_team, innings_no, runs, wickets, overs

### balls
- id, innings_id, over_no, ball_no, batsman_id, non_striker_id, bowler_id,
  runs, extras_type, is_wicket, dismissal_type, fielder_id, created_at

### batting_scores  (denormalised per innings/player)
- innings_id, player_id, runs, balls, fours, sixes, sr, dismissal, bowler_id, fielder_id

### bowling_scores
- innings_id, player_id, overs, maidens, runs, wickets, economy

### attendance
- match_id, player_id, checked_in_at

### products
- id, name, slug, category, description, price, sale_price, stock,
  images (jsonb), variants (jsonb)

### product_reviews
- id, product_id, user_id, rating (1-5), comment, created_at

### orders
- id, user_id, total, status ('pending'|'paid'|'shipped'|'delivered'|'cancelled'),
  payment_method ('paypal'|'bank'),
  delivery (jsonb: name,address,email,phone), created_at

### order_items
- order_id, product_id, qty, unit_price, variant

### notifications
- id, title, message, target (jsonb), scheduled_at, sent_at

### contact_messages  (used by /contact form)
- id, name, email, phone, subject, message, created_at

### announcements
- id, title, body, pinned, published_at

## RLS (sketch)
- Enable RLS on every table above.
- public read on: teams, players (limited cols), tournaments, matches,
  innings, balls, batting_scores, bowling_scores, products, product_reviews,
  announcements.
- profiles: select public cols for everyone, update only own row.
- orders/order_items: user can read/write own; admin via `has_role()`.
- attendance: insert own; admin read all.
- contact_messages: insert anonymous; admin read.
- admin-only writes on: teams, tournaments, matches, balls, products,
  notifications, announcements (via `public.has_role(auth.uid(),'admin')`).

## Storage buckets
- `avatars` (public)
- `team-badges` (public)
- `match-media` (public)
- `tournament-media` (public)
- `products` (public)

## Auth
- Email/password + Google OAuth (enable in Supabase Auth providers).
- Redirect URLs: `${origin}` (signup confirm), `${origin}/reset-password`.
