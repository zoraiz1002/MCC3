-- Ensure upsert(on_conflict=user_id) works on players.
-- Multiple NULL user_id values are allowed under a UNIQUE constraint in Postgres,
-- so existing rows without a linked auth user are unaffected.
do $$ begin
  alter table public.players add constraint players_user_id_key unique (user_id);
exception when duplicate_object then null; when duplicate_table then null; end $$;
