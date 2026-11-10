-- ============================================================================
-- CHARACTER ARCHIVE - CHARACTER CHAT OPENS (🔥) PRODUCTION DATABASE MIGRATION
-- ============================================================================
-- File: supabase-character-chat-opens.sql
-- Description:
--   1. Ensures table 'character_chat_opens' exists to log each unique chat open event.
--   2. Ensures table 'character_metrics' has column 'chats_count'.
--   3. Provides atomic SECURITY DEFINER RPC functions with search_path = public, pg_temp:
--        - record_character_chat_open(p_character_id, p_event_id) [ATOMIC DEDUPLICATED INCREMENT]
--        - get_character_chat_open_counts() [PUBLIC AGGREGATED CHAT OPENS COUNT]
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CREATE LOG TABLE: character_chat_opens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.character_chat_opens (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_chat_opens_character_id ON public.character_chat_opens(character_id);
CREATE INDEX IF NOT EXISTS idx_character_chat_opens_user_id ON public.character_chat_opens(user_id);

-- Ensure character_metrics table exists and has chats_count
CREATE TABLE IF NOT EXISTS public.character_metrics (
  character_id TEXT PRIMARY KEY,
  chats_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='character_metrics' AND column_name='chats_count') THEN
    ALTER TABLE public.character_metrics ADD COLUMN chats_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.character_chat_opens ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'character_chat_opens'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Public SELECT policy for character_chat_opens
CREATE POLICY "Public can view character_chat_opens"
ON public.character_chat_opens
FOR SELECT
TO public
USING (true);

-- Public INSERT policy for character_chat_opens
CREATE POLICY "Anyone can insert chat open event"
ON public.character_chat_opens
FOR INSERT
TO public
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. RPC: RECORD CHAT OPEN EVENT (DEDUPLICATED & ATOMIC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_character_chat_open(
  p_character_id TEXT,
  p_event_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT;
  v_event_id TEXT;
  v_new_total INTEGER := 0;
  v_result JSONB;
BEGIN
  IF p_character_id IS NULL OR TRIM(p_character_id) = '' THEN
    RAISE EXCEPTION 'Mã nhân vật không hợp lệ.';
  END IF;

  v_user_id := auth.uid()::text;
  v_event_id := COALESCE(p_event_id, 'open_' || p_character_id || '_' || EXTRACT(EPOCH FROM NOW())::text || '_' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6));

  -- Deduplicate event_id to prevent double counts from duplicate requests
  IF NOT EXISTS (SELECT 1 FROM public.character_chat_opens WHERE id = v_event_id) THEN
    INSERT INTO public.character_chat_opens (id, character_id, user_id, created_at)
    VALUES (v_event_id, p_character_id, v_user_id, NOW());

    -- Atomically increment chats_count in character_metrics
    INSERT INTO public.character_metrics (character_id, chats_count, last_calculated_at)
    VALUES (p_character_id, 1, NOW())
    ON CONFLICT (character_id) DO UPDATE SET
      chats_count = COALESCE(public.character_metrics.chats_count, 0) + 1,
      last_calculated_at = NOW();
  END IF;

  SELECT COALESCE(chats_count, 0) INTO v_new_total
  FROM public.character_metrics
  WHERE character_id = p_character_id;

  SELECT jsonb_build_object(
    'character_id', p_character_id,
    'total_chats', v_new_total
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC: GET ALL CHAT OPEN COUNTS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_character_chat_open_counts()
RETURNS TABLE (
  character_id TEXT,
  total_chats INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT m.character_id, COALESCE(m.chats_count, 0)::integer AS total_chats
  FROM public.character_metrics m;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. PERMISSIONS & EXECUTE GRANTS
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.character_chat_opens TO anon, authenticated;
GRANT SELECT ON public.character_metrics TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.record_character_chat_open(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_character_chat_open_counts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_character_chat_open(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_character_chat_open_counts() TO anon, authenticated;

COMMIT;
