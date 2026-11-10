-- ============================================================================
-- CHARACTER ARCHIVE - CHARACTER FAVORITES (❤️) PRODUCTION DATABASE MIGRATION
-- ============================================================================
-- File: supabase-character-favorites.sql
-- Description:
--   1. Creates table 'character_favorites' with PRIMARY KEY (character_id, user_id).
--   2. Strict RLS Configuration:
--        - ANON cannot directly SELECT raw table 'character_favorites'.
--        - AUTHENTICATED can ONLY SELECT, INSERT, and DELETE their OWN rows (user_id = auth.uid()).
--   3. Provides SECURITY DEFINER RPC functions with SET search_path = public, pg_temp:
--        - toggle_character_favorite(p_character_id) [CONCURRENCY SAFE ATOMIC TOGGLE]
--        - get_character_favorite_counts() [PUBLIC AGGREGATED COUNT ONLY - NO USER_ID EXPOSED]
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CREATE TABLE: character_favorites
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.character_favorites (
  character_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (character_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_character_favorites_character_id ON public.character_favorites(character_id);
CREATE INDEX IF NOT EXISTS idx_character_favorites_user_id ON public.character_favorites(user_id);

-- ----------------------------------------------------------------------------
-- 2. STRICT ROW LEVEL SECURITY (RLS) POLICIES ON character_favorites ONLY
-- ----------------------------------------------------------------------------
ALTER TABLE public.character_favorites ENABLE ROW LEVEL SECURITY;

-- Explicitly drop legacy policies on character_favorites only (without touching other tables)
DROP POLICY IF EXISTS "Public can view character_favorites" ON public.character_favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.character_favorites;
DROP POLICY IF EXISTS "Users can insert their own favorite" ON public.character_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorite" ON public.character_favorites;

-- Policy 1: Authenticated users can ONLY SELECT their own favorited rows
CREATE POLICY "Users can view their own favorites"
ON public.character_favorites
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

-- Policy 2: Authenticated users can ONLY INSERT their own favorited row
CREATE POLICY "Users can insert their own favorite"
ON public.character_favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

-- Policy 3: Authenticated users can ONLY DELETE their own favorited row
CREATE POLICY "Users can delete their own favorite"
ON public.character_favorites
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

-- ----------------------------------------------------------------------------
-- 3. RPC: CONCURRENCY-SAFE ATOMIC TOGGLE FAVORITE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_character_favorite(
  p_character_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT;
  v_is_favorited BOOLEAN := FALSE;
  v_total BIGINT := 0;
  v_result JSONB;
BEGIN
  -- 1. Require authenticated user
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Bạn phải đăng nhập để yêu thích nhân vật.';
  END IF;

  IF p_character_id IS NULL OR TRIM(p_character_id) = '' THEN
    RAISE EXCEPTION 'Mã nhân vật không hợp lệ.';
  END IF;

  -- 2. Concurrency-safe atomic toggle
  IF EXISTS (
    SELECT 1 FROM public.character_favorites
    WHERE character_id = p_character_id AND user_id = v_user_id
  ) THEN
    DELETE FROM public.character_favorites
    WHERE character_id = p_character_id AND user_id = v_user_id;
    v_is_favorited := FALSE;
  ELSE
    INSERT INTO public.character_favorites (character_id, user_id, created_at)
    VALUES (p_character_id, v_user_id, NOW())
    ON CONFLICT (character_id, user_id) DO NOTHING;
    v_is_favorited := TRUE;
  END IF;

  -- 3. Calculate updated total count for this character
  SELECT COUNT(*)::bigint INTO v_total
  FROM public.character_favorites
  WHERE character_id = p_character_id;

  -- 4. Construct response payload
  SELECT jsonb_build_object(
    'character_id', p_character_id,
    'is_favorited', v_is_favorited,
    'total_favorites', v_total
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC: PUBLIC AGGREGATED FAVORITE COUNTS (NO USER_ID EXPOSED)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_character_favorite_counts()
RETURNS TABLE (
  character_id TEXT,
  total_favorites BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT f.character_id, COUNT(*)::bigint AS total_favorites
  FROM public.character_favorites f
  GROUP BY f.character_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. PERMISSIONS & EXECUTE GRANTS HARDENING
-- ----------------------------------------------------------------------------
-- Revoke direct raw table access from anon (anon cannot SELECT raw character_favorites table)
REVOKE ALL ON public.character_favorites FROM anon;
GRANT SELECT, INSERT, DELETE ON public.character_favorites TO authenticated;

-- Hardened RPC Execute Grants
REVOKE EXECUTE ON FUNCTION public.toggle_character_favorite(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_character_favorite_counts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.toggle_character_favorite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_character_favorite_counts() TO anon, authenticated;

COMMIT;
