-- ============================================================================
-- CHARACTER ARCHIVE - CHARACTER REVIEWS & METRICS FULLY HARDENED PRODUCTION MIGRATION
-- ============================================================================
-- File: supabase-character-reviews-fix.sql
-- Description:
--   1. Ensures tables 'character_reviews' and 'character_metrics' exist without dropping data.
--   2. Dynamically drops ALL existing policies on character_reviews and character_metrics to prevent lingering open rules.
--   3. Hardens RLS & Table Permissions:
--        - REVOKES all direct INSERT/UPDATE/DELETE table writes from anon and authenticated.
--        - ONLY allows public SELECT access on non-hidden reviews and character metrics.
--   4. Provides SECURITY DEFINER RPC functions with SET search_path = public, pg_temp:
--        - get_public_character_reviews(p_character_id) [RETURNS PUBLIC FIELDS ONLY - NO USER_ID/EMAIL]
--        - submit_character_review(p_character_id, p_rating, p_feedback) [PRESERVES IS_HIDDEN ON UPDATE]
--        - delete_character_review(p_review_id)
--        - recalculate_character_metrics_internal(p_character_id) [INTERNAL ONLY]
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CREATE OR VERIFY TABLE: character_reviews
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.character_reviews (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist in case of legacy schema variations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='character_reviews' AND column_name='is_hidden') THEN
    ALTER TABLE public.character_reviews ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='character_reviews' AND column_name='avatar_url') THEN
    ALTER TABLE public.character_reviews ADD COLUMN avatar_url TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='character_reviews' AND column_name='updated_at') THEN
    ALTER TABLE public.character_reviews ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Enforce 1 review per user per character via UNIQUE constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_character_reviews_char_user'
  ) THEN
    -- Only add constraint if no duplicates exist, otherwise user can inspect duplicates first
    IF NOT EXISTS (
      SELECT character_id, user_id FROM public.character_reviews GROUP BY character_id, user_id HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE public.character_reviews ADD CONSTRAINT uq_character_reviews_char_user UNIQUE (character_id, user_id);
    END IF;
  END IF;
END $$;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_character_reviews_character_id ON public.character_reviews(character_id);
CREATE INDEX IF NOT EXISTS idx_character_reviews_user_id ON public.character_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_character_reviews_is_hidden ON public.character_reviews(is_hidden);
CREATE INDEX IF NOT EXISTS idx_character_reviews_created_at ON public.character_reviews(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. CREATE OR VERIFY TABLE: character_metrics
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.character_metrics (
  character_id TEXT PRIMARY KEY,
  total_reviews INTEGER DEFAULT 0,
  total_stars INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0.00,
  star_1_count INTEGER DEFAULT 0,
  star_2_count INTEGER DEFAULT 0,
  star_3_count INTEGER DEFAULT 0,
  star_4_count INTEGER DEFAULT 0,
  star_5_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  chats_count INTEGER DEFAULT 0,
  hot_score NUMERIC(8,2) DEFAULT 0.00,
  is_hidden_from_ranking BOOLEAN DEFAULT FALSE,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_metrics_hot_score ON public.character_metrics(hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_character_metrics_avg_rating ON public.character_metrics(average_rating DESC);

-- ----------------------------------------------------------------------------
-- 3. DYNAMICALLY DROP ALL EXISTING POLICIES & REBUILD STRICT RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.character_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_metrics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('character_reviews', 'character_metrics')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Policy on character_reviews: Public SELECT for non-hidden reviews only (or owner)
CREATE POLICY "Public can view non-hidden reviews"
ON public.character_reviews
FOR SELECT
TO public
USING (is_hidden IS NOT TRUE OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- Policy on character_metrics: Public SELECT ONLY
CREATE POLICY "Public can view character_metrics"
ON public.character_metrics
FOR SELECT
TO public
USING (true);

-- ----------------------------------------------------------------------------
-- 4. RPC: PUBLIC REVIEWS PROJECTION (RETURNS PUBLIC FIELDS ONLY - NO USER_ID)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_character_reviews(
  p_character_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  character_id TEXT,
  username TEXT,
  avatar_url TEXT,
  rating INTEGER,
  feedback TEXT,
  is_hidden BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_character_id IS NOT NULL AND TRIM(p_character_id) <> '' THEN
    RETURN QUERY
    SELECT
      r.id,
      r.character_id,
      r.username,
      r.avatar_url,
      r.rating,
      r.feedback,
      r.is_hidden,
      r.created_at,
      r.updated_at
    FROM public.character_reviews r
    WHERE r.character_id = p_character_id
      AND (r.is_hidden IS NOT TRUE)
    ORDER BY r.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT
      r.id,
      r.character_id,
      r.username,
      r.avatar_url,
      r.rating,
      r.feedback,
      r.is_hidden,
      r.created_at,
      r.updated_at
    FROM public.character_reviews r
    WHERE (r.is_hidden IS NOT TRUE)
    ORDER BY r.created_at DESC;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. INTERNAL METRICS RECALCULATION FUNCTION (PRIVATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_character_metrics_internal(p_character_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_reviews INTEGER := 0;
  v_total_stars INTEGER := 0;
  v_avg_rating NUMERIC(3,2) := 0.00;
  v_s1 INTEGER := 0;
  v_s2 INTEGER := 0;
  v_s3 INTEGER := 0;
  v_s4 INTEGER := 0;
  v_s5 INTEGER := 0;
  v_views INTEGER := 0;
  v_chats INTEGER := 0;
  v_hot_score NUMERIC(8,2) := 0.00;
BEGIN
  -- 1. Compute aggregate statistics strictly from non-hidden reviews
  SELECT
    COUNT(*),
    COALESCE(SUM(rating), 0),
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00),
    COUNT(*) FILTER (WHERE rating = 1),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 5)
  INTO
    v_total_reviews,
    v_total_stars,
    v_avg_rating,
    v_s1, v_s2, v_s3, v_s4, v_s5
  FROM public.character_reviews
  WHERE character_id = p_character_id
    AND (is_hidden IS NOT TRUE);

  -- 2. Preserve existing view & chat counters
  SELECT COALESCE(views_count, 0), COALESCE(chats_count, 0)
  INTO v_views, v_chats
  FROM public.character_metrics
  WHERE character_id = p_character_id;

  -- 3. Calculate Hot Score formula: (AvgRating/5 * 400) + (ReviewLog * 300) + (ViewsLog * 150) + (ChatsLog * 150)
  v_hot_score := ROUND((
    ( (v_avg_rating / 5.0) * 400.0 ) +
    ( LEAST(1.0, LOG(1 + v_total_reviews) / LOG(1 + 50.0)) * 300.0 ) +
    ( LEAST(1.0, LOG(1 + COALESCE(v_views, 0)) / LOG(1 + 300.0)) * 150.0 ) +
    ( LEAST(1.0, LOG(1 + COALESCE(v_chats, 0)) / LOG(1 + 100.0)) * 150.0 )
  )::numeric, 2);

  -- 4. Upsert into character_metrics
  INSERT INTO public.character_metrics (
    character_id,
    total_reviews,
    total_stars,
    average_rating,
    star_1_count,
    star_2_count,
    star_3_count,
    star_4_count,
    star_5_count,
    views_count,
    chats_count,
    hot_score,
    last_calculated_at
  ) VALUES (
    p_character_id,
    v_total_reviews,
    v_total_stars,
    v_avg_rating,
    v_s1,
    v_s2,
    v_s3,
    v_s4,
    v_s5,
    COALESCE(v_views, 0),
    COALESCE(v_chats, 0),
    v_hot_score,
    NOW()
  )
  ON CONFLICT (character_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    total_stars = EXCLUDED.total_stars,
    average_rating = EXCLUDED.average_rating,
    star_1_count = EXCLUDED.star_1_count,
    star_2_count = EXCLUDED.star_2_count,
    star_3_count = EXCLUDED.star_3_count,
    star_4_count = EXCLUDED.star_4_count,
    star_5_count = EXCLUDED.star_5_count,
    hot_score = EXCLUDED.hot_score,
    last_calculated_at = NOW();
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: SUBMIT / UPDATE CHARACTER REVIEW (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_character_review(
  p_character_id TEXT,
  p_rating INTEGER,
  p_feedback TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT;
  v_username TEXT := 'Thành viên';
  v_avatar_url TEXT := '';
  v_review_id TEXT;
  v_existing_hidden BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
  v_result JSONB;
  v_has_username_col BOOLEAN := FALSE;
  v_has_display_name_col BOOLEAN := FALSE;
  v_has_avatar_col BOOLEAN := FALSE;
BEGIN
  -- 1. Require authenticated user
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Bạn phải đăng nhập để gửi đánh giá nhân vật.';
  END IF;

  -- 2. Validate inputs
  IF p_character_id IS NULL OR TRIM(p_character_id) = '' THEN
    RAISE EXCEPTION 'Mã nhân vật không hợp lệ.';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Số sao đánh giá không hợp lệ (phải từ 1 đến 5).';
  END IF;

  IF p_feedback IS NULL OR TRIM(p_feedback) = '' THEN
    RAISE EXCEPTION 'Vui lòng nhập nội dung đánh giá.';
  END IF;

  -- 3. Safely check profile schema columns before querying
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='username') INTO v_has_username_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name') INTO v_has_display_name_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') INTO v_has_avatar_col;

  IF v_has_username_col THEN
    EXECUTE 'SELECT COALESCE(username, ''Thành viên'') FROM public.profiles WHERE id::text = $1' INTO v_username USING v_user_id;
  ELSIF v_has_display_name_col THEN
    EXECUTE 'SELECT COALESCE(display_name, ''Thành viên'') FROM public.profiles WHERE id::text = $1' INTO v_username USING v_user_id;
  END IF;

  IF v_has_avatar_col THEN
    EXECUTE 'SELECT COALESCE(avatar_url, '''') FROM public.profiles WHERE id::text = $1' INTO v_avatar_url USING v_user_id;
  END IF;

  IF v_username IS NULL OR v_username = '' THEN
    v_username := 'Thành viên ' || SUBSTRING(v_user_id FROM 1 FOR 6);
  END IF;

  -- 4. Check if review already exists for this user and character
  SELECT id, is_hidden INTO v_review_id, v_existing_hidden
  FROM public.character_reviews
  WHERE character_id = p_character_id AND user_id = v_user_id;

  IF v_review_id IS NOT NULL THEN
    -- Update existing review without overriding admin hidden status
    UPDATE public.character_reviews
    SET
      rating = p_rating,
      feedback = TRIM(p_feedback),
      username = v_username,
      avatar_url = v_avatar_url,
      updated_at = v_now
    WHERE id = v_review_id;
  ELSE
    -- Create new review
    v_review_id := 'rev_' || p_character_id || '_' || v_user_id;
    v_existing_hidden := FALSE;
    INSERT INTO public.character_reviews (
      id,
      character_id,
      user_id,
      username,
      avatar_url,
      rating,
      feedback,
      is_hidden,
      created_at,
      updated_at
    ) VALUES (
      v_review_id,
      p_character_id,
      v_user_id,
      v_username,
      v_avatar_url,
      p_rating,
      TRIM(p_feedback),
      FALSE,
      v_now,
      v_now
    );
  END IF;

  -- 5. Recalculate metrics atomically
  PERFORM public.recalculate_character_metrics_internal(p_character_id);

  -- 6. Return JSON response reflecting actual database state
  SELECT jsonb_build_object(
    'id', v_review_id,
    'character_id', p_character_id,
    'username', v_username,
    'avatar_url', v_avatar_url,
    'rating', p_rating,
    'feedback', TRIM(p_feedback),
    'is_hidden', v_existing_hidden,
    'created_at', v_now,
    'updated_at', v_now
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: DELETE CHARACTER REVIEW (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_character_review(
  p_review_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT;
  v_is_admin BOOLEAN := FALSE;
  v_owner_id TEXT;
  v_character_id TEXT;
  v_has_role_col BOOLEAN := FALSE;
  v_has_is_admin_col BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Bạn chưa đăng nhập.';
  END IF;

  -- Lookup target review details directly from database
  SELECT user_id, character_id INTO v_owner_id, v_character_id
  FROM public.character_reviews
  WHERE id = p_review_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy bài đánh giá cần xóa.';
  END IF;

  -- Check admin columns safely
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') INTO v_has_role_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_admin') INTO v_has_is_admin_col;

  IF v_has_role_col THEN
    EXECUTE 'SELECT COALESCE(role = ''admin'', false) FROM public.profiles WHERE id::text = $1' INTO v_is_admin USING v_user_id;
  ELSIF v_has_is_admin_col THEN
    EXECUTE 'SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id::text = $1' INTO v_is_admin USING v_user_id;
  END IF;

  IF v_owner_id <> v_user_id AND NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Bạn không có quyền xóa bài đánh giá này.';
  END IF;

  -- Delete review
  DELETE FROM public.character_reviews WHERE id = p_review_id;

  -- Recalculate metrics
  PERFORM public.recalculate_character_metrics_internal(v_character_id);

  RETURN jsonb_build_object('success', true, 'deleted_id', p_review_id, 'character_id', v_character_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. PERMISSIONS & EXECUTE GRANTS HARDENING
-- ----------------------------------------------------------------------------
-- 8.1 Revoke ALL direct table write permissions from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON public.character_reviews FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.character_metrics FROM anon, authenticated;

-- 8.2 Grant SELECT access to public
GRANT SELECT ON public.character_reviews TO anon, authenticated;
GRANT SELECT ON public.character_metrics TO anon, authenticated;

-- 8.3 Revoke EXECUTE from PUBLIC / anon on all RPCs
REVOKE EXECUTE ON FUNCTION public.recalculate_character_metrics_internal(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_character_review(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_character_review(TEXT) FROM PUBLIC, anon;

-- 8.4 Grant EXECUTE to public / authenticated for RPCs
GRANT EXECUTE ON FUNCTION public.get_public_character_reviews(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_character_review(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_character_review(TEXT) TO authenticated;

COMMIT;
