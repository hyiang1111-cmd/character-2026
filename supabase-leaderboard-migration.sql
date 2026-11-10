-- ====================================================================
-- CHARACTER ARCHIVE - SUPABASE CENTRALIZED ACTIVITY LEADERBOARD
-- & CHARACTER TAGS SYNCHRONIZATION MIGRATION
-- Run this script in your Supabase SQL Editor.
-- This script provides server-side validated heartbeats, anti-spam chat tracking,
-- multi-device synchronization, and full public access to character tags.
-- ====================================================================

-- 1. Ensure measurement and metric columns exist on public.profiles
alter table public.profiles add column if not exists active_time_seconds integer default 0;
alter table public.profiles add column if not exists character_chats_count integer default 0;
alter table public.profiles add column if not exists donation_xu integer default 0;
alter table public.profiles add column if not exists total_donated numeric default 0;
alter table public.profiles add column if not exists is_banned boolean default false;
alter table public.profiles add column if not exists active_badge_ids text[] default '{}';

-- 2. CREATE TABLE FOR REALTIME ACTIVITY HEARTBEATS
-- Tracks user heartbeat sessions, prevents multi-tab multiplication, and records online presence
create table if not exists public.user_activity_heartbeats (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  last_heartbeat_at timestamptz not null default now(),
  active_session_id text,
  last_user_agent text,
  updated_at timestamptz not null default now()
);

alter table public.user_activity_heartbeats enable row level security;

-- Public can view heartbeat status to know who is currently online
drop policy if exists "Heartbeats are viewable by everyone" on public.user_activity_heartbeats;
create policy "Heartbeats are viewable by everyone"
  on public.user_activity_heartbeats for select
  to anon, authenticated
  using (true);

-- 3. CREATE TABLE FOR VERIFIED CHARACTER CHAT INTERACTIONS
-- Logs each valid chat start action with anti-spam deduplication
create table if not exists public.character_chat_interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  character_id text not null,
  session_id text not null,
  interacted_at timestamptz not null default now()
);

create index if not exists idx_chat_interactions_user_time on public.character_chat_interactions(user_id, interacted_at desc);
create index if not exists idx_chat_interactions_char on public.character_chat_interactions(character_id);

alter table public.character_chat_interactions enable row level security;

-- Users can view their own interactions, admins can view all
drop policy if exists "Users can view their own chat interactions" on public.character_chat_interactions;
create policy "Users can view their own chat interactions"
  on public.character_chat_interactions for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- 4. SERVER-SIDE RPC: record_activity_heartbeat
-- Validates that heartbeats are not spammed across multiple tabs or automated scripts.
-- Only allows ONE 30-second increment per user every 25 seconds across all devices.
create or replace function public.record_activity_heartbeat(
  p_user_id uuid,
  p_session_id text,
  p_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_heartbeat timestamptz;
  v_new_total integer;
  v_elapsed_seconds numeric;
  v_clamped_seconds integer;
begin
  -- Clamp increment to valid range (5s to 60s)
  v_clamped_seconds := least(greatest(coalesce(p_seconds, 30), 5), 60);

  -- Check previous heartbeat timestamp across all open tabs/devices for this user
  select last_heartbeat_at into v_last_heartbeat
  from public.user_activity_heartbeats
  where user_id = p_user_id;

  if v_last_heartbeat is not null then
    v_elapsed_seconds := extract(epoch from (now() - v_last_heartbeat));
    
    -- Anti-cheat / Anti-multi-tab:
    -- If another tab or device sent a heartbeat within the last 25 seconds,
    -- reject the duplicate increment to prevent multiplying active time.
    if v_elapsed_seconds < 25 then
      select coalesce(active_time_seconds, 0) into v_new_total from public.profiles where id = p_user_id;
      return jsonb_build_object(
        'success', false,
        'reason', 'rate_limited',
        'active_time_seconds', coalesce(v_new_total, 0),
        'elapsed', v_elapsed_seconds
      );
    end if;
  end if;

  -- Upsert heartbeat record
  insert into public.user_activity_heartbeats (user_id, last_heartbeat_at, active_session_id, updated_at)
  values (p_user_id, now(), p_session_id, now())
  on conflict (user_id) do update
  set last_heartbeat_at = now(),
      active_session_id = p_session_id,
      updated_at = now();

  -- Increment user's accumulated active_time_seconds on profiles table
  update public.profiles
  set active_time_seconds = coalesce(active_time_seconds, 0) + v_clamped_seconds,
      updated_at = now()
  where id = p_user_id
  returning active_time_seconds into v_new_total;

  return jsonb_build_object(
    'success', true,
    'active_time_seconds', coalesce(v_new_total, 0),
    'added_seconds', v_clamped_seconds
  );
end;
$$;

grant execute on function public.record_activity_heartbeat to anon, authenticated;

-- 5. SERVER-SIDE RPC: record_character_chat_interaction
-- Validates chat click events with a 30-second anti-spam window per character.
create or replace function public.record_character_chat_interaction(
  p_user_id uuid,
  p_character_id text,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
  v_new_chats_count integer;
begin
  -- Anti-spam check: has this user opened this character chat within the last 30 seconds?
  select count(*) into v_recent_count
  from public.character_chat_interactions
  where user_id = p_user_id
    and character_id = p_character_id
    and interacted_at > (now() - interval '30 seconds');

  if v_recent_count > 0 then
    select coalesce(character_chats_count, 0) into v_new_chats_count from public.profiles where id = p_user_id;
    return jsonb_build_object(
      'success', false,
      'reason', 'spam_cooldown',
      'character_chats_count', coalesce(v_new_chats_count, 0)
    );
  end if;

  -- Record valid interaction log
  insert into public.character_chat_interactions (user_id, character_id, session_id, interacted_at)
  values (p_user_id, p_character_id, p_session_id, now());

  -- Increment user's character_chats_count on profiles
  update public.profiles
  set character_chats_count = coalesce(character_chats_count, 0) + 1,
      updated_at = now()
  where id = p_user_id
  returning character_chats_count into v_new_chats_count;

  return jsonb_build_object(
    'success', true,
    'character_chats_count', coalesce(v_new_chats_count, 0)
  );
end;
$$;

grant execute on function public.record_character_chat_interaction to anon, authenticated;

-- 6. CREATE SECURE PUBLIC VIEW FOR LEADERBOARD
-- Ranks members strictly by accumulated active_time_seconds and character_chats_count.
-- Online status (is_online) is strictly a presence indicator (active in last 2m), NOT ranking factor.
-- Offline members retain their exact score and rank.
create or replace view public.public_leaderboard_view as
select 
  p.id,
  p.username,
  p.avatar_url,
  p.bio,
  p.vip_tier,
  p.is_admin,
  coalesce(p.active_time_seconds, 0) as active_time_seconds,
  coalesce(p.character_chats_count, 0) as character_chats_count,
  coalesce(p.characters_explored_count, 0) as characters_explored_count,
  coalesce(p.messages_count, 0) as messages_count,
  coalesce(p.total_donated, 0) as total_donated,
  coalesce(p.donation_xu, 0) as donation_xu,
  coalesce(p.active_badge_ids, '{}') as active_badge_ids,
  p.created_at,
  case 
    when h.last_heartbeat_at is not null and h.last_heartbeat_at > (now() - interval '2 minutes') then true 
    else false 
  end as is_online,
  h.last_heartbeat_at
from public.profiles p
left join public.user_activity_heartbeats h on p.id = h.user_id
where p.is_banned = false;

grant select on public.public_leaderboard_view to anon, authenticated;

-- 7. ENSURE CHARACTER TAGS TABLE AND PUBLIC SELECT PERMISSION
create table if not exists public.character_tags (
  id text primary key,
  name text not null,
  slug text not null,
  description text default '',
  color text default '#D88CA3',
  icon text default '✨',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.character_tags enable row level security;

-- Guests and members can read all character tags
drop policy if exists "Character tags are viewable by everyone" on public.character_tags;
create policy "Character tags are viewable by everyone"
  on public.character_tags for select
  to anon, authenticated
  using (true);

-- Admins can insert, update, delete character tags
drop policy if exists "Admins can manage character tags" on public.character_tags;
create policy "Admins can manage character tags"
  on public.character_tags for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

grant select on public.character_tags to anon, authenticated;

-- 8. ENSURE RLS POLICIES ON PROFILES ALLOW SAFE PUBLIC SELECTS
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (is_banned = false);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 9. ENSURE BADGES CAN BE VIEWED BY EVERYONE
grant select on public.badges to anon, authenticated;
grant select on public.user_badges to anon, authenticated;

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

-- 10. ENABLE REALTIME PUBLICATION FOR LIVE SYNCHRONIZATION
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when others then
  end;
  begin
    alter publication supabase_realtime add table public.user_activity_heartbeats;
  exception when others then
  end;
  begin
    alter publication supabase_realtime add table public.character_tags;
  exception when others then
  end;
  begin
    alter publication supabase_realtime add table public.user_badges;
  exception when others then
  end;
end $$;
