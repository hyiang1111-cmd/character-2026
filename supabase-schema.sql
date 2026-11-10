-- ====================================================================
-- CHARACTER ARCHIVE - COMMUNITY & MEMBER SYSTEM SUPABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor to initialize all tables,
-- row-level security (RLS) policies, and indexes.
-- ====================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text not null,
  avatar_url text default '',
  bio text default '',
  is_admin boolean default false,
  is_banned boolean default false,
  vip_tier text default 'none', -- 'none', 'vip', 'golden', 'angel', 'eternal'
  total_donated numeric default 0,
  messages_count integer default 0,
  characters_explored_count integer default 0,
  active_time_seconds integer default 0,
  character_chats_count integer default 0,
  donation_xu integer default 0,
  active_badge_ids text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Case-insensitive index for usernames
create unique index if not exists idx_profiles_username_lower on public.profiles (lower(username));

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles RLS Policies: safe for anon and authenticated
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (is_banned = false);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

-- SECURE PUBLIC VIEW FOR LEADERBOARD
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

grant select on public.public_leaderboard_view to anon, authenticated;

-- 2. BADGES TABLE
create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null default '✦',
  color text not null default '#865B9E',
  border_style text default 'solid',
  category text not null default 'automatic', -- 'automatic', 'admin', 'vip'
  condition_type text default 'manual', -- 'messages', 'exploration', 'loyalty', 'manual', 'donation'
  condition_value integer default 0,
  is_enabled boolean default true,
  created_at timestamptz default now()
);

alter table public.badges enable row level security;

create policy "Badges are viewable by everyone"
  on public.badges for select
  using (true);

create policy "Admins can insert/update/delete badges"
  on public.badges for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- 3. USER BADGES TABLE
create table if not exists public.user_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id text references public.badges(id) on delete cascade not null,
  granted_at timestamptz default now(),
  granted_by uuid references public.profiles(id),
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "User badges are viewable by everyone"
  on public.user_badges for select
  using (true);

create policy "Admins can insert/delete user badges"
  on public.user_badges for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "System can assign badges to self"
  on public.user_badges for insert
  with check (auth.uid() = user_id);

-- 4. LOUNGE MESSAGES TABLE
create table if not exists public.lounge_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  username text not null,
  avatar_url text default '',
  vip_tier text default 'none',
  content text not null,
  reply_to_id uuid references public.lounge_messages(id) on delete set null,
  reply_to_username text,
  reply_to_content text,
  likes_count integer default 0,
  liked_by_users uuid[] default '{}',
  is_deleted boolean default false,
  created_at timestamptz default now()
);

alter table public.lounge_messages enable row level security;

create policy "Lounge messages are viewable by everyone"
  on public.lounge_messages for select
  using (true);

create policy "Authenticated users can insert messages"
  on public.lounge_messages for insert
  with check (
    auth.uid() = user_id and
    not exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_banned = true
    )
  );

create policy "Users can update likes or soft delete own messages"
  on public.lounge_messages for update
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can delete messages"
  on public.lounge_messages for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Enable Realtime for Lounge Messages
alter publication supabase_realtime add table public.lounge_messages;

-- 5. DONATIONS TABLE
create table if not exists public.donations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  username text not null,
  amount numeric not null check (amount > 0),
  transaction_code text not null,
  transfer_time text not null,
  notes text default '',
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason text default '',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

alter table public.donations enable row level security;

create policy "Users can view their own donations"
  on public.donations for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Users can insert donation claims"
  on public.donations for insert
  with check (auth.uid() = user_id);

create policy "Admins can update donation claims"
  on public.donations for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- 6. DONATION CONFIG TABLE
create table if not exists public.donation_config (
  id integer primary key default 1 check (id = 1),
  bank_name text default 'MB Bank (Ngân hàng Quân Đội)',
  account_number text default '9999999999',
  account_holder text default 'PINK CHARACTER ARCHIVE',
  qr_code_url text default 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  transfer_note_prefix text default 'DONATE ARCHIVE',
  updated_at timestamptz default now()
);

alter table public.donation_config enable row level security;

create policy "Everyone can view donation config"
  on public.donation_config for select
  using (true);

create policy "Admins can update donation config"
  on public.donation_config for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Seed initial donation config row
insert into public.donation_config (id, bank_name, account_number, account_holder, qr_code_url, transfer_note_prefix)
values (1, 'MB Bank (Ngân hàng Quân Đội)', '0388998899', 'CHARACTER ARCHIVE ADMIN', '', 'ARCHIVE VIP')
on conflict (id) do nothing;
