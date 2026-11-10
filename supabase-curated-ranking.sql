-- ====================================================================
-- CHARACTER ARCHIVE - ADMIN CURATED RANKING (TOP 1, TOP 2, TOP 3)
-- Run this in your Supabase SQL Editor to create the curated ranking table.
-- ====================================================================

-- 1. Create table for Admin Curated Character Ranking
create table if not exists public.character_curated_ranking (
  id text primary key default 'default',
  top1_character_id text default null,
  top2_character_id text default null,
  top3_character_id text default null,
  updated_at timestamptz default now(),
  updated_by text default null
);

-- Seed default record if not present
insert into public.character_curated_ranking (id, top1_character_id, top2_character_id, top3_character_id)
values ('default', null, null, null)
on conflict (id) do nothing;

-- 2. Enable Row Level Security (RLS)
alter table public.character_curated_ranking enable row level security;

-- Public read access (anon & authenticated)
drop policy if exists "Curated ranking is viewable by everyone" on public.character_curated_ranking;
create policy "Curated ranking is viewable by everyone"
  on public.character_curated_ranking for select
  to anon, authenticated
  using (true);

-- Write access for application updates
drop policy if exists "Anyone can write curated ranking" on public.character_curated_ranking;
create policy "Anyone can write curated ranking"
  on public.character_curated_ranking for all
  to anon, authenticated
  using (true)
  with check (true);

-- 3. Grant permissions
grant select, insert, update on public.character_curated_ranking to anon, authenticated;

-- 4. Enable Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.character_curated_ranking;
  exception when others then null;
  end;
end $$;
