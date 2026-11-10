-- ====================================================================
-- CHARACTER ARCHIVE - SUPABASE PUBLIC LEADERBOARD MIGRATION
-- Run this in your Supabase SQL Editor to enable public leaderboard access
-- for all visitors (guests, members, admins) without exposing private data.
-- ====================================================================

-- 1. Ensure all performance & measurement columns exist on public.profiles
alter table public.profiles add column if not exists active_time_seconds integer default 0;
alter table public.profiles add column if not exists character_chats_count integer default 0;
alter table public.profiles add column if not exists donation_xu integer default 0;
alter table public.profiles add column if not exists total_donated numeric default 0;
alter table public.profiles add column if not exists is_banned boolean default false;
alter table public.profiles add column if not exists active_badge_ids text[] default '{}';

-- 2. CREATE SECURE PUBLIC VIEW FOR LEADERBOARD
-- Exposes ONLY public display fields. Never exposes email, phone, or private data.
create or replace view public.public_leaderboard_view as
select 
  id,
  username,
  avatar_url,
  bio,
  vip_tier,
  is_admin,
  active_time_seconds,
  character_chats_count,
  characters_explored_count,
  messages_count,
  total_donated,
  donation_xu,
  active_badge_ids,
  created_at
from public.profiles
where is_banned = false;

-- 3. GRANT SELECT PERMISSION TO PUBLIC ROLES (anon and authenticated)
grant select on public.public_leaderboard_view to anon, authenticated;

-- 4. ENSURE RLS POLICIES ON PROFILES ALLOW SAFE PUBLIC SELECTS
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (is_banned = false);

-- 5. ENSURE BADGES AND USER_BADGES CAN BE VIEWED BY EVERYONE
grant select on public.badges to anon, authenticated;
grant select on public.user_badges to anon, authenticated;

-- If custom_badges exists, grant select
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'custom_badges') then
    grant select on public.custom_badges to anon, authenticated;
  end if;
end $$;

drop policy if exists "Badges are viewable by everyone" on public.badges;
create policy "Badges are viewable by everyone"
  on public.badges for select
  to anon, authenticated
  using (true);

drop policy if exists "User badges are viewable by everyone" on public.user_badges;
create policy "User badges are viewable by everyone"
  on public.user_badges for select
  to anon, authenticated
  using (true);

-- 6. DONATIONS PRIVACY:
-- Guest users should NOT be able to read raw donation claims (containing transaction codes, notes, bank accounts).
-- The donations table remains protected with RLS:
-- Users can only view their own donations; Admins can view all donations.
drop policy if exists "Users can view their own donations" on public.donations;
create policy "Users can view their own donations"
  on public.donations for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- 7. ENABLE REALTIME PUBLICATION FOR REALTIME LEADERBOARD SYNCHRONIZATION
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when others then
    -- Table already added or publication exists
  end;
  begin
    alter publication supabase_realtime add table public.user_badges;
  exception when others then
    -- Table already added or publication exists
  end;
end $$;
