-- ====================================================================
-- CHARACTER ARCHIVE - CHARACTER REVIEWS, TAGS & HOT RANKING MIGRATION
-- Run this in your Supabase SQL Editor to enable:
-- 1. Character Tags Management
-- 2. Character Reviews & 5-Star Ratings
-- 3. Character Hot Ranking & Anti-Spam Metrics
-- 4. Ranking Settings & Formula Weights
-- ====================================================================

-- 1. CHARACTER TAGS TABLE
create table if not exists public.character_tags (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text default '',
  color text default '#D88CA3',
  icon text default '✨',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Case-insensitive unique index on trimmed name
create unique index if not exists idx_character_tags_lower_name 
  on public.character_tags (lower(trim(name)));

-- 2. CHARACTER REVIEWS & FEEDBACK TABLE
create table if not exists public.character_reviews (
  id text primary key,
  character_id text not null,
  user_id text not null,
  username text not null,
  avatar_url text default '',
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback text not null,
  is_hidden boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_character_user_review unique (character_id, user_id)
);

create index if not exists idx_character_reviews_char_id 
  on public.character_reviews (character_id);
create index if not exists idx_character_reviews_user_id 
  on public.character_reviews (user_id);
create index if not exists idx_character_reviews_rating 
  on public.character_reviews (rating);

-- 3. CHARACTER METRICS & HOT SCORE TABLE
create table if not exists public.character_metrics (
  character_id text primary key,
  total_reviews integer default 0,
  total_stars integer default 0,
  average_rating numeric(3, 2) default 0.00,
  star_1_count integer default 0,
  star_2_count integer default 0,
  star_3_count integer default 0,
  star_4_count integer default 0,
  star_5_count integer default 0,
  views_count integer default 0,
  chats_count integer default 0,
  hot_score numeric(10, 2) default 0.00,
  is_hidden_from_ranking boolean default false,
  last_calculated_at timestamptz default now()
);

-- 4. RANKING SETTINGS & FORMULA WEIGHTS TABLE
create table if not exists public.character_ranking_settings (
  id text primary key default 'default',
  is_ranking_enabled boolean default true,
  weight_rating numeric default 40.0,
  weight_reviews numeric default 30.0,
  weight_views numeric default 15.0,
  weight_chats numeric default 15.0,
  min_reviews_for_boost integer default 3,
  anti_spam_cooldown_seconds integer default 300,
  updated_at timestamptz default now()
);

-- Seed default ranking settings if not present
insert into public.character_ranking_settings (id, is_ranking_enabled, weight_rating, weight_reviews, weight_views, weight_chats)
values ('default', true, 40.0, 30.0, 15.0, 15.0)
on conflict (id) do nothing;

-- 5. RANKING HISTORY LOG TABLE
create table if not exists public.character_ranking_history (
  id text primary key,
  character_id text not null,
  character_name text not null,
  old_rank integer,
  new_rank integer,
  hot_score numeric(10, 2) default 0,
  change_reason text default 'Score updated',
  recorded_at timestamptz default now()
);

create index if not exists idx_ranking_history_char 
  on public.character_ranking_history (character_id);

-- 6. PUBLIC REVIEWS VIEW (Hides private / hidden reviews)
create or replace view public.public_character_reviews_view as
select 
  id,
  character_id,
  user_id,
  username,
  avatar_url,
  rating,
  feedback,
  created_at,
  updated_at
from public.character_reviews
where is_hidden = false;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.character_tags enable row level security;
alter table public.character_reviews enable row level security;
alter table public.character_metrics enable row level security;
alter table public.character_ranking_settings enable row level security;
alter table public.character_ranking_history enable row level security;

-- RLS: character_tags
-- Everyone can read active tags
drop policy if exists "Tags are viewable by everyone" on public.character_tags;
create policy "Tags are viewable by everyone"
  on public.character_tags for select
  to anon, authenticated
  using (true);

-- Only Admin can insert/update/delete tags
drop policy if exists "Admins can manage tags" on public.character_tags;
create policy "Admins can manage tags"
  on public.character_tags for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- RLS: character_reviews
-- Everyone can read non-hidden reviews
drop policy if exists "Public can read non-hidden reviews" on public.character_reviews;
create policy "Public can read non-hidden reviews"
  on public.character_reviews for select
  to anon, authenticated
  using (
    is_hidden = false or
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Logged in users can insert review for themselves
drop policy if exists "Users can insert their own review" on public.character_reviews;
create policy "Users can insert their own review"
  on public.character_reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own reviews
drop policy if exists "Users can update their own review" on public.character_reviews;
create policy "Users can update their own review"
  on public.character_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own reviews; Admins can delete any review
drop policy if exists "Users or Admins can delete reviews" on public.character_reviews;
create policy "Users or Admins can delete reviews"
  on public.character_reviews for delete
  to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Admins can update any review (e.g. is_hidden)
drop policy if exists "Admins can update reviews" on public.character_reviews;
create policy "Admins can update reviews"
  on public.character_reviews for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- RLS: character_metrics
-- Public can read metrics (for Hot Ranking)
drop policy if exists "Public can view character metrics" on public.character_metrics;
create policy "Public can view character metrics"
  on public.character_metrics for select
  to anon, authenticated
  using (true);

-- Metrics managed by system and admins
drop policy if exists "Admins can manage character metrics" on public.character_metrics;
create policy "Admins can manage character metrics"
  on public.character_metrics for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- RLS: character_ranking_settings
-- Public can read settings (e.g. check if ranking is enabled)
drop policy if exists "Public can view ranking settings" on public.character_ranking_settings;
create policy "Public can view ranking settings"
  on public.character_ranking_settings for select
  to anon, authenticated
  using (true);

-- Admins can update settings
drop policy if exists "Admins can manage ranking settings" on public.character_ranking_settings;
create policy "Admins can manage ranking settings"
  on public.character_ranking_settings for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- RLS: character_ranking_history
-- Public can view ranking history
drop policy if exists "Public can view ranking history" on public.character_ranking_history;
create policy "Public can view ranking history"
  on public.character_ranking_history for select
  to anon, authenticated
  using (true);

-- Admins can manage history
drop policy if exists "Admins can manage ranking history" on public.character_ranking_history;
create policy "Admins can manage ranking history"
  on public.character_ranking_history for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- 8. GRANT SELECT ON VIEWS & TABLES
grant select on public.character_tags to anon, authenticated;
grant select on public.public_character_reviews_view to anon, authenticated;
grant select on public.character_metrics to anon, authenticated;
grant select on public.character_ranking_settings to anon, authenticated;
grant select on public.character_ranking_history to anon, authenticated;

-- 9. REALTIME PUBLICATION SETUP
do $$
begin
  begin
    alter publication supabase_realtime add table public.character_tags;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.character_reviews;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.character_metrics;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.character_ranking_settings;
  exception when others then null;
  end;
end $$;
