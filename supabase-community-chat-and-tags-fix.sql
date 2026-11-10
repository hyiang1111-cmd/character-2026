-- ====================================================================
-- CHARACTER ARCHIVE - PRODUCTION ZERO-TRUST DATABASE MIGRATION
-- AUDITED SECURITY FIX: DIRECT WRITE REVOCATION, NORMALIZED LIKES,
-- DYNAMIC RLS PURGE & PROFILE VERIFICATION
-- Run this entire script in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

-- ==========================================
-- 0. SCHEMA INTEGRITY & PROFILE COLUMN SAFETY
-- ==========================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
      alter table public.profiles add column username text default '';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url') then
      alter table public.profiles add column avatar_url text default '';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
      alter table public.profiles add column is_admin boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
      alter table public.profiles add column role text default 'member';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_banned') then
      alter table public.profiles add column is_banned boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'vip_tier') then
      alter table public.profiles add column vip_tier text default 'none';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'messages_count') then
      alter table public.profiles add column messages_count integer default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
      alter table public.profiles add column updated_at timestamptz default now();
    end if;
  end if;
end $$;


-- ==========================================
-- 1. DYNAMIC PURGE OF ALL EXISTING POLICIES
-- ==========================================

do $$
declare
  r record;
begin
  for r in (
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('lounge_messages', 'character_tags', 'lounge_message_likes')
  ) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;


-- ==========================================
-- 2. NORMALIZED LIKES TABLE & DATA MIGRATION
-- ==========================================

create table if not exists public.lounge_message_likes (
  message_id text not null,
  user_id text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- Safely migrate legacy liked_by_users array into normalized lounge_message_likes table
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'liked_by_users'
  ) then
    insert into public.lounge_message_likes (message_id, user_id)
    select m.id, unnest(m.liked_by_users)
    from public.lounge_messages m
    where m.liked_by_users is not null and array_length(m.liked_by_users, 1) > 0
    on conflict (message_id, user_id) do nothing;
  end if;
end $$;

-- Enable RLS on likes table
alter table public.lounge_message_likes enable row level security;

-- Revoke direct table writes on likes table (all operations MUST use RPC)
revoke insert, update, delete on public.lounge_message_likes from anon, authenticated;
grant select on public.lounge_message_likes to authenticated;


-- ==========================================
-- 3. CHARACTER TAGS TABLE & ADMIN POLICIES
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

-- Case-insensitive unique tag name index
create unique index if not exists idx_character_tags_lower_name
  on public.character_tags (lower(trim(name)));

-- Enable RLS
alter table public.character_tags enable row level security;

-- Policy 1: Public SELECT (anon + non-admin authenticated see ONLY active tags; Admins see ALL tags)
create policy "Character tags select policy"
  on public.character_tags for select
  to anon, authenticated
  using (
    is_active = true 
    or is_active is null 
    or (
      auth.uid() is not null and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and (coalesce(profiles.is_admin, false) or coalesce(profiles.role = 'admin', false))
      )
    )
  );

-- Policy 2: Admin INSERT ONLY
create policy "Admins can insert tags"
  on public.character_tags for insert
  to authenticated
  with check (
    auth.uid() is not null and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (coalesce(profiles.is_admin, false) or coalesce(profiles.role = 'admin', false))
    )
  );

-- Policy 3: Admin UPDATE ONLY
create policy "Admins can update tags"
  on public.character_tags for update
  to authenticated
  using (
    auth.uid() is not null and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (coalesce(profiles.is_admin, false) or coalesce(profiles.role = 'admin', false))
    )
  )
  with check (
    auth.uid() is not null and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (coalesce(profiles.is_admin, false) or coalesce(profiles.role = 'admin', false))
    )
  );

-- Policy 4: Admin DELETE ONLY
create policy "Admins can delete tags"
  on public.character_tags for delete
  to authenticated
  using (
    auth.uid() is not null and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (coalesce(profiles.is_admin, false) or coalesce(profiles.role = 'admin', false))
    )
  );

-- ZERO-TRUST RPC: upsert_character_tag
create or replace function public.upsert_character_tag(p_tag jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_is_admin boolean := false;
  v_id text;
  v_name text;
  v_slug text;
  v_description text;
  v_color text;
  v_icon text;
  v_sort_order integer;
  v_is_active boolean;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'Bạn phải đăng nhập tài khoản Quản trị viên.');
  end if;

  select (coalesce(is_admin, false) or coalesce(role = 'admin', false)) into v_is_admin
  from public.profiles
  where id = v_caller_id;

  if v_is_admin is not true then
    return jsonb_build_object('success', false, 'error', 'Bạn không có quyền quản trị viên.');
  end if;

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

-- ZERO-TRUST RPC: delete_character_tag
create or replace function public.delete_character_tag(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_is_admin boolean := false;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'Bạn phải đăng nhập tài khoản Quản trị viên.');
  end if;

  select (coalesce(is_admin, false) or coalesce(role = 'admin', false)) into v_is_admin
  from public.profiles
  where id = v_caller_id;

  if v_is_admin is not true then
    return jsonb_build_object('success', false, 'error', 'Bạn không có quyền quản trị viên.');
  end if;

  delete from public.character_tags
  where id = p_id or slug = lower(trim(p_id));

  return jsonb_build_object('success', true);
end;
$$;


-- ==========================================
-- 4. COMMUNITY CHAT (THE LOUNGE) TABLE & ZERO DIRECT WRITES
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

-- Safely convert uuid types to text if legacy table was created with UUIDs
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.lounge_messages alter column id type text using id::text;
  end if;

  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'user_id' and data_type = 'uuid'
  ) then
    alter table public.lounge_messages drop constraint if exists lounge_messages_user_id_fkey;
    alter table public.lounge_messages alter column user_id type text using user_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'lounge_messages' and column_name = 'reply_to_id' and data_type = 'uuid'
  ) then
    alter table public.lounge_messages drop constraint if exists lounge_messages_reply_to_id_fkey;
    alter table public.lounge_messages alter column reply_to_id type text using reply_to_id::text;
  end if;
end $$;

-- Indexes for performance
create index if not exists idx_lounge_messages_created_at
  on public.lounge_messages (created_at asc);

create index if not exists idx_lounge_messages_not_deleted
  on public.lounge_messages (is_deleted, created_at asc);

create index if not exists idx_lounge_messages_user_id
  on public.lounge_messages (user_id);

-- Enable Row Level Security (RLS)
alter table public.lounge_messages enable row level security;

-- ONLY 1 POLICY ON LOUNGE MESSAGES: PUBLIC SELECT FOR NON-DELETED MESSAGES
create policy "Public lounge messages select"
  on public.lounge_messages for select
  to anon, authenticated
  using (is_deleted = false or is_deleted is null);

-- CRITICAL SECURITY REQUIREMENT 1: REVOKE ALL DIRECT TABLE WRITES FROM anon & authenticated
revoke insert, update, delete on public.lounge_messages from anon, authenticated;


-- ==========================================
-- 5. SERVER-VERIFIED AUTHORITATIVE CHAT RPCs
-- ==========================================

-- ZERO-TRUST RPC: send_lounge_chat_message (Strict profile lookup, no fallback, anti-spoof)
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
  v_caller_id uuid;
  v_effective_user_id text;
  v_effective_username text;
  v_effective_avatar text;
  v_effective_vip text;
  v_is_banned boolean := false;
  v_clean_content text;
  v_new_id text;
  v_now timestamptz := now();
begin
  -- 1. STRICT AUTHENTICATION REQUIREMENT: auth.uid() MUST NOT BE NULL
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'Bạn phải đăng nhập tài khoản để gửi tin nhắn.');
  end if;

  v_clean_content := trim(coalesce(p_content, ''));
  if v_clean_content = '' then
    return jsonb_build_object('success', false, 'error', 'Nội dung tin nhắn không được để trống.');
  end if;

  if length(v_clean_content) > 500 then
    return jsonb_build_object('success', false, 'error', 'Tin nhắn quá dài (tối đa 500 ký tự).');
  end if;

  -- 2. RATE LIMITING: Check 1-second cooldown per user
  if exists (
    select 1 from public.lounge_messages
    where user_id = v_caller_id::text
      and created_at > (v_now - interval '1 second')
  ) then
    return jsonb_build_object('success', false, 'error', 'Vui lòng chờ giây lát trước khi gửi tin nhắn tiếp theo.');
  end if;

  -- 3. STRICT PROFILE VERIFICATION: NO FALLBACK TO CLIENT ARGS
  v_effective_user_id := v_caller_id::text;

  select
    coalesce(nullif(trim(username), ''), 'Member'),
    coalesce(avatar_url, ''),
    coalesce(vip_tier, 'none'),
    coalesce(is_banned, false)
  into
    v_effective_username,
    v_effective_avatar,
    v_effective_vip,
    v_is_banned
  from public.profiles
  where id = v_caller_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Không tìm thấy hồ sơ cá nhân. Vui lòng hoàn tất tạo hồ sơ trước khi gửi tin nhắn.');
  end if;

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
    v_effective_user_id,
    v_effective_username,
    v_effective_avatar,
    v_effective_vip,
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

  -- Update messages_count safely
  update public.profiles
  set messages_count = coalesce(messages_count, 0) + 1,
      updated_at = v_now
  where id = v_caller_id;

  return jsonb_build_object(
    'success', true,
    'message', jsonb_build_object(
      'id', v_new_id,
      'user_id', v_effective_user_id,
      'username', v_effective_username,
      'avatar_url', v_effective_avatar,
      'vip_tier', v_effective_vip,
      'content', v_clean_content,
      'reply_to_id', nullif(trim(p_reply_to_id), ''),
      'reply_to_username', nullif(trim(p_reply_to_username), ''),
      'reply_to_content', nullif(trim(p_reply_to_content), ''),
      'likes_count', 0,
      'liked_by_users', jsonb_build_array(),
      'is_deleted', false,
      'status', 'sent',
      'created_at', v_now
    )
  );
end;
$$;


-- ZERO-TRUST RPC: toggle_like_lounge_chat_message (Normalized table toggle + Transaction Lock)
create or replace function public.toggle_like_lounge_chat_message(
  p_message_id text,
  p_user_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_effective_user_id text;
  v_is_liked boolean := false;
  v_new_likes_count integer := 0;
  v_dummy text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'Bạn phải đăng nhập để thả tim tin nhắn.');
  end if;

  v_effective_user_id := v_caller_id::text;

  -- 1. Lock the target message row for update to ensure concurrency safety
  select id into v_dummy
  from public.lounge_messages
  where id = p_message_id and (is_deleted = false or is_deleted is null)
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Tin nhắn không tồn tại hoặc đã bị xóa.');
  end if;

  -- 2. Toggle record in normalized lounge_message_likes table
  if exists (
    select 1 from public.lounge_message_likes
    where message_id = p_message_id and user_id = v_effective_user_id
  ) then
    delete from public.lounge_message_likes
    where message_id = p_message_id and user_id = v_effective_user_id;
    v_is_liked := false;
  else
    insert into public.lounge_message_likes (message_id, user_id, created_at)
    values (p_message_id, v_effective_user_id, now())
    on conflict (message_id, user_id) do nothing;
    v_is_liked := true;
  end if;

  -- 3. Calculate exact updated count from normalized likes table
  select count(*)::integer into v_new_likes_count
  from public.lounge_message_likes
  where message_id = p_message_id;

  -- 4. Sync likes_count back to lounge_messages table
  update public.lounge_messages
  set likes_count = v_new_likes_count,
      updated_at = now()
  where id = p_message_id;

  return jsonb_build_object(
    'success', true,
    'likes_count', v_new_likes_count,
    'liked', v_is_liked
  );
end;
$$;


-- ZERO-TRUST RPC: delete_lounge_chat_message (Author or Admin Soft-Delete)
create or replace function public.delete_lounge_chat_message(
  p_message_id text,
  p_requester_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_author_id text;
  v_is_admin boolean := false;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'Bạn phải đăng nhập để thực hiện xóa tin nhắn.');
  end if;

  select user_id into v_author_id
  from public.lounge_messages
  where id = p_message_id;

  if v_author_id is null then
    return jsonb_build_object('success', false, 'error', 'Tin nhắn không tồn tại.');
  end if;

  select (coalesce(is_admin, false) or coalesce(role = 'admin', false)) into v_is_admin
  from public.profiles
  where id = v_caller_id;

  if v_author_id = v_caller_id::text or v_is_admin is true then
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


-- PRIVACY-SAFE PUBLIC RPC: get_lounge_chat_history (DOES NOT LEAK USER LIKER IDs)
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
    coalesce(m.likes_count, 0) as likes_count,
    -- PRIVACY SAFEGUARD: Return ONLY viewer's own ID if liked by viewer; NEVER leak other members' IDs
    case
      when auth.uid() is not null and exists (
        select 1 from public.lounge_message_likes l
        where l.message_id = m.id and l.user_id = auth.uid()::text
      )
      then array[auth.uid()::text]
      else '{}'::text[]
    end as liked_by_users,
    coalesce(m.is_deleted, false) as is_deleted,
    m.status,
    m.created_at
  from public.lounge_messages m
  where (m.is_deleted = false or m.is_deleted is null)
    and (p_before_created_at is null or m.created_at < p_before_created_at)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;


-- ==========================================
-- 6. REALTIME REPLICATION & EXECUTION GRANTS
-- ==========================================

-- Replica Identity Full
alter table public.lounge_messages replica identity full;
alter table public.character_tags replica identity full;
alter table public.lounge_message_likes replica identity full;

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

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lounge_message_likes'
  ) then
    alter publication supabase_realtime add table public.lounge_message_likes;
  end if;
end $$;

-- Table Grants: Revoke all direct write operations from anon and authenticated
revoke insert, update, delete on public.lounge_messages from anon, authenticated;
revoke insert, update, delete on public.character_tags from anon;

-- Grant SELECT to anon and authenticated
grant select on public.lounge_messages to anon, authenticated;
grant select on public.character_tags to anon, authenticated;
grant select on public.lounge_message_likes to authenticated;

-- Grant INSERT, UPDATE, DELETE on character_tags to authenticated ONLY (enforced via RLS)
grant insert, update, delete on public.character_tags to authenticated;

-- Function Execution Grants: Revoke mutating RPCs from PUBLIC and anon
revoke execute on function public.upsert_character_tag(jsonb) from public, anon;
revoke execute on function public.delete_character_tag(text) from public, anon;
revoke execute on function public.send_lounge_chat_message(text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.toggle_like_lounge_chat_message(text, text) from public, anon;
revoke execute on function public.delete_lounge_chat_message(text, text) from public, anon;

-- Grant EXECUTE on mutating RPCs strictly to authenticated users
grant execute on function public.upsert_character_tag(jsonb) to authenticated;
grant execute on function public.delete_character_tag(text) to authenticated;
grant execute on function public.send_lounge_chat_message(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.toggle_like_lounge_chat_message(text, text) to authenticated;
grant execute on function public.delete_lounge_chat_message(text, text) to authenticated;

-- Grant EXECUTE on public read RPC to anon and authenticated
grant execute on function public.get_lounge_chat_history(integer, timestamptz) to anon, authenticated;


-- ==========================================
-- 7. POST-MIGRATION VERIFICATION QUERIES
-- ==========================================

-- 1. Verify Active RLS Policies
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('lounge_messages', 'character_tags', 'lounge_message_likes')
order by tablename, policyname;

-- 2. Verify Table Role Grants (Confirm NO write grants on lounge_messages)
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('lounge_messages', 'character_tags', 'lounge_message_likes')
order by table_name, grantee;

-- 3. Verify Function EXECUTE Grants
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'send_lounge_chat_message',
    'delete_lounge_chat_message',
    'toggle_like_lounge_chat_message',
    'get_lounge_chat_history',
    'upsert_character_tag',
    'delete_character_tag'
  )
order by routine_name, grantee;
