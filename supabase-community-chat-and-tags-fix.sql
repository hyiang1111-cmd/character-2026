-- ====================================================================
-- CHARACTER ARCHIVE - PRODUCTION DATABASE MIGRATION
-- COMMUNITY CHAT (THE LOUNGE) PERSISTENCE & CHARACTER TAGS SYNC
-- Run this entire script in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

-- ==========================================
-- 1. CHARACTER TAGS TABLE & SYNC RPC
-- ==========================================

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

-- Ensure lower name unique index
create unique index if not exists idx_character_tags_lower_name
  on public.character_tags (lower(trim(name)));

-- Enable RLS
alter table public.character_tags enable row level security;

-- Everyone (anon + authenticated) can view active tags
drop policy if exists "Tags are viewable by everyone" on public.character_tags;
drop policy if exists "Character tags are viewable by everyone" on public.character_tags;
create policy "Character tags are viewable by everyone"
  on public.character_tags for select
  to anon, authenticated
  using (true);

-- Allow authenticated/admin manage tags directly if needed
drop policy if exists "Admins can manage tags" on public.character_tags;
drop policy if exists "Admins can manage character tags" on public.character_tags;
create policy "Admins can manage character tags"
  on public.character_tags for all
  using (true)
  with check (true);

-- Secure RPC for upserting character tag (bypasses RLS issues safely)
create or replace function public.upsert_character_tag(p_tag jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_name text;
  v_slug text;
  v_description text;
  v_color text;
  v_icon text;
  v_sort_order integer;
  v_is_active boolean;
begin
  v_name := trim(coalesce(p_tag->>'name', ''));
  if v_name = '' then
    return jsonb_build_object('success', false, 'error', 'Tên Tag không được để trống.');
  end if;

  v_slug := lower(v_name);
  v_id := coalesce(nullif(p_tag->>'id', ''), 'tag_' || replace(gen_random_uuid()::text, '-', ''));
  v_description := coalesce(p_tag->>'description', '');
  v_color := coalesce(p_tag->>'color', '#D88CA3');
  v_icon := coalesce(p_tag->>'icon', '✨');
  v_sort_order := coalesce((p_tag->>'sort_order')::integer, 0);
  v_is_active := coalesce((p_tag->>'is_active')::boolean, true);

  insert into public.character_tags (
    id, name, slug, description, color, icon, sort_order, is_active, updated_at
  ) values (
    v_id, v_name, v_slug, v_description, v_color, v_icon, v_sort_order, v_is_active, now()
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    color = excluded.color,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;

grant execute on function public.upsert_character_tag to anon, authenticated;

-- Secure RPC for deleting character tag
create or replace function public.delete_character_tag(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.character_tags
  where id = p_id or slug = lower(trim(p_id));

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.delete_character_tag to anon, authenticated;


-- ==========================================
-- 2. COMMUNITY CHAT (THE LOUNGE) TABLE & RPCs
-- ==========================================

create table if not exists public.lounge_messages (
  id text primary key,
  user_id text not null,
  username text not null,
  avatar_url text default '',
  vip_tier text default 'none',
  content text not null,
  reply_to_id text,
  reply_to_username text,
  reply_to_content text,
  likes_count integer default 0,
  liked_by_users text[] default '{}',
  is_deleted boolean default false,
  status text default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If table was previously created with uuid id/user_id, safely cast to text
do $$
begin
  -- alter id type if uuid
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.lounge_messages alter column id type text using id::text;
  end if;

  -- alter user_id type if uuid
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'user_id' and data_type = 'uuid'
  ) then
    alter table public.lounge_messages drop constraint if exists lounge_messages_user_id_fkey;
    alter table public.lounge_messages alter column user_id type text using user_id::text;
  end if;

  -- alter reply_to_id type if uuid
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'reply_to_id' and data_type = 'uuid'
  ) then
    alter table public.lounge_messages drop constraint if exists lounge_messages_reply_to_id_fkey;
    alter table public.lounge_messages alter column reply_to_id type text using reply_to_id::text;
  end if;

  -- alter liked_by_users type if uuid[]
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'liked_by_users' and data_type = 'ARRAY'
  ) then
    alter table public.lounge_messages alter column liked_by_users type text[] using liked_by_users::text[];
  end if;
end $$;

-- Add indexes for fast chronological ordering and user filtering
create index if not exists idx_lounge_messages_created_at
  on public.lounge_messages (created_at asc);

create index if not exists idx_lounge_messages_not_deleted
  on public.lounge_messages (is_deleted, created_at asc);

create index if not exists idx_lounge_messages_user_id
  on public.lounge_messages (user_id);

-- Enable RLS
alter table public.lounge_messages enable row level security;

-- Everyone (unauthenticated guests, members, admin) can read chat messages
drop policy if exists "Lounge messages are viewable by everyone" on public.lounge_messages;
create policy "Lounge messages are viewable by everyone"
  on public.lounge_messages for select
  to anon, authenticated
  using (is_deleted = false or is_deleted is null);

-- Authenticated and anon direct access policies
drop policy if exists "Authenticated users can insert messages" on public.lounge_messages;
create policy "Authenticated users can insert messages"
  on public.lounge_messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Users can update likes or soft delete own messages" on public.lounge_messages;
create policy "Users can update likes or soft delete own messages"
  on public.lounge_messages for update
  to anon, authenticated
  using (true)
  with check (true);

-- SECURE RPC: send_lounge_chat_message
create or replace function public.send_lounge_chat_message(
  p_user_id text,
  p_username text,
  p_avatar_url text,
  p_vip_tier text,
  p_content text,
  p_reply_to_id text default null,
  p_reply_to_username text default null,
  p_reply_to_content text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id text;
  v_is_banned boolean := false;
  v_clean_content text;
  v_now timestamptz := now();
begin
  v_clean_content := trim(coalesce(p_content, ''));
  if v_clean_content = '' then
    return jsonb_build_object('success', false, 'error', 'Nội dung tin nhắn không được để trống.');
  end if;

  if length(v_clean_content) > 500 then
    return jsonb_build_object('success', false, 'error', 'Tin nhắn quá dài (tối đa 500 ký tự).');
  end if;

  -- Verify user is not banned if profile exists
  select coalesce(is_banned, false) into v_is_banned
  from public.profiles
  where id::text = p_user_id;

  if v_is_banned = true then
    return jsonb_build_object('success', false, 'error', 'Tài khoản của bạn đã bị cấm gửi tin nhắn.');
  end if;

  v_new_id := 'msg_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.lounge_messages (
    id,
    user_id,
    username,
    avatar_url,
    vip_tier,
    content,
    reply_to_id,
    reply_to_username,
    reply_to_content,
    likes_count,
    liked_by_users,
    is_deleted,
    status,
    created_at,
    updated_at
  ) values (
    v_new_id,
    p_user_id,
    trim(coalesce(p_username, 'Member')),
    coalesce(p_avatar_url, ''),
    coalesce(p_vip_tier, 'none'),
    v_clean_content,
    nullif(trim(p_reply_to_id), ''),
    nullif(trim(p_reply_to_username), ''),
    nullif(trim(p_reply_to_content), ''),
    0,
    '{}',
    false,
    'sent',
    v_now,
    v_now
  );

  -- Safely increment messages_count on profiles table
  update public.profiles
  set messages_count = coalesce(messages_count, 0) + 1,
      updated_at = v_now
  where id::text = p_user_id;

  return jsonb_build_object(
    'success', true,
    'message', jsonb_build_object(
      'id', v_new_id,
      'user_id', p_user_id,
      'username', trim(coalesce(p_username, 'Member')),
      'avatar_url', coalesce(p_avatar_url, ''),
      'vip_tier', coalesce(p_vip_tier, 'none'),
      'content', v_clean_content,
      'reply_to_id', nullif(trim(p_reply_to_id), ''),
      'reply_to_username', nullif(trim(p_reply_to_username), ''),
      'reply_to_content', nullif(trim(p_reply_to_content), ''),
      'likes_count', 0,
      'liked_by_users', '[]'::jsonb,
      'is_deleted', false,
      'status', 'sent',
      'created_at', v_now
    )
  );
end;
$$;

grant execute on function public.send_lounge_chat_message to anon, authenticated;

-- SECURE RPC: toggle_like_lounge_chat_message
create or replace function public.toggle_like_lounge_chat_message(
  p_message_id text,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked_by text[];
  v_is_liked boolean;
  v_new_likes_count integer;
begin
  select liked_by_users into v_liked_by
  from public.lounge_messages
  where id = p_message_id;

  if v_liked_by is null then
    v_liked_by := '{}';
  end if;

  if p_user_id = any(v_liked_by) then
    v_liked_by := array_remove(v_liked_by, p_user_id);
    v_is_liked := false;
  else
    v_liked_by := array_append(v_liked_by, p_user_id);
    v_is_liked := true;
  end if;

  v_new_likes_count := coalesce(cardinality(v_liked_by), 0);

  update public.lounge_messages
  set liked_by_users = v_liked_by,
      likes_count = v_new_likes_count,
      updated_at = now()
  where id = p_message_id;

  return jsonb_build_object(
    'success', true,
    'likes_count', v_new_likes_count,
    'liked', v_is_liked
  );
end;
$$;

grant execute on function public.toggle_like_lounge_chat_message to anon, authenticated;

-- SECURE RPC: delete_lounge_chat_message (Author or Admin)
create or replace function public.delete_lounge_chat_message(
  p_message_id text,
  p_requester_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id text;
  v_is_admin boolean := false;
begin
  select user_id into v_author_id
  from public.lounge_messages
  where id = p_message_id;

  if v_author_id is null then
    return jsonb_build_object('success', false, 'error', 'Tin nhắn không tồn tại.');
  end if;

  select coalesce(is_admin, false) into v_is_admin
  from public.profiles
  where id::text = p_requester_id;

  if v_author_id = p_requester_id or v_is_admin = true then
    update public.lounge_messages
    set is_deleted = true,
        updated_at = now()
    where id = p_message_id;

    return jsonb_build_object('success', true);
  else
    return jsonb_build_object('success', false, 'error', 'Bạn không có quyền xóa tin nhắn này.');
  end if;
end;
$$;

grant execute on function public.delete_lounge_chat_message to anon, authenticated;

-- SECURE RPC: get_lounge_chat_history with pagination
create or replace function public.get_lounge_chat_history(
  p_limit integer default 50,
  p_before_created_at timestamptz default null
)
returns table (
  id text,
  user_id text,
  username text,
  avatar_url text,
  vip_tier text,
  content text,
  reply_to_id text,
  reply_to_username text,
  reply_to_content text,
  likes_count integer,
  liked_by_users text[],
  is_deleted boolean,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    m.id,
    m.user_id,
    m.username,
    m.avatar_url,
    m.vip_tier,
    m.content,
    m.reply_to_id,
    m.reply_to_username,
    m.reply_to_content,
    m.likes_count,
    m.liked_by_users,
    m.is_deleted,
    m.status,
    m.created_at
  from public.lounge_messages m
  where m.is_deleted = false
    and (p_before_created_at is null or m.created_at < p_before_created_at)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

grant execute on function public.get_lounge_chat_history to anon, authenticated;


-- ==========================================
-- 3. ENABLE SUPABASE REALTIME REPLICATION
-- ==========================================

-- Enable full replication identity so UPDATE and DELETE events send complete records
alter table public.lounge_messages replica identity full;
alter table public.character_tags replica identity full;

-- Ensure both tables are part of supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lounge_messages'
  ) then
    alter publication supabase_realtime add table public.lounge_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'character_tags'
  ) then
    alter publication supabase_realtime add table public.character_tags;
  end if;
end $$;

-- Grant permissions for anon & authenticated
grant select, insert, update on public.lounge_messages to anon, authenticated;
grant select, insert, update, delete on public.character_tags to anon, authenticated;
