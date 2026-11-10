-- ====================================================================
-- CHARACTER ARCHIVE - SUPABASE COMMUNITY CHAT CLEANUP MIGRATION
-- Run this script manually in Supabase SQL Editor (Dashboard -> SQL Editor)
-- IF and ONLY IF you wish to purge legacy Chat tables and RPCs from Supabase.
-- ====================================================================

-- ==========================================
-- 1. REMOVE CHAT TABLES FROM REALTIME REPLICATION
-- ==========================================

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lounge_messages'
  ) then
    alter publication supabase_realtime drop table public.lounge_messages;
  end if;

  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lounge_message_likes'
  ) then
    alter publication supabase_realtime drop table public.lounge_message_likes;
  end if;
end $$;


-- ==========================================
-- 2. DROP CHAT EXCLUSIVE RPC FUNCTIONS
-- ==========================================

drop function if exists public.send_lounge_chat_message(text, text, text, text, text, text, text, text);
drop function if exists public.delete_lounge_chat_message(text, text);
drop function if exists public.toggle_like_lounge_chat_message(text, text);
drop function if exists public.get_lounge_chat_history(integer, timestamptz);


-- ==========================================
-- 3. DROP CHAT EXCLUSIVE TABLES
-- ==========================================

drop table if exists public.lounge_message_likes cascade;
drop table if exists public.lounge_messages cascade;


-- ==========================================
-- 4. CONFIRMATION OF PRESERVED TABLES
-- ==========================================
-- The following core system tables ARE NOT TOUCHED and remain 100% active:
--   - public.profiles (User Accounts, Leaderboards, Activity, Avatars)
--   - public.character_tags (Character Categorization & Tag Filtering)
--   - public.character_reviews / ratings (Character Reviews & Feedback)
--   - public.donation_claims / configs (VIP System & Hall of Fame)
--   - public.vip_tier_config / badges (VIP Badges & Honors)
