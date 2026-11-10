-- ============================================================================
-- CHARACTER ARCHIVE - CHARACTER REVIEWS & METRICS FULLY HARDENED PRODUCTION MIGRATION
-- ============================================================================
-- File: supabase-character-reviews-fix.sql
-- Run this script in the Supabase SQL Editor.
-- Description:
--   1. Ensures tables 'character_reviews' and 'character_metrics' exist without dropping data.
--   2. Adds unique constraint uq_character_reviews_char_user to enforce 1 review per user per character.
--   3. Hardens RLS & Permissions:
--        - REVOKES all direct INSERT/UPDATE/DELETE table writes from anon and authenticated.
--        - ONLY allows public SELECT access on non-hidden reviews and character metrics.
--        - Strictly forbids authenticated members from updating character_metrics directly.
--   4. Provides SECURITY DEFINER RPC functions with SET search_path = public, pg_temp:
--        - submit_character_review(p_character_id, p_rating, p_feedback)
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

-- Deduplicate existing reviews (if any duplicate (character_id, user_id) pairs exist, keep latest created)
DELETE FROM public.character_reviews a
USING public.character_reviews b
WHERE a.character_id = b.character_id
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Enforce 1 review per user per character via UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_character_reviews_char_user'
  ) THEN
    ALTER TABLE public.character_reviews
    ADD CONSTRAINT uq_character_reviews_char_user UNIQUE (character_id, user_id);
  END IF;
END $$;

-- Indexes for performance
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS HARDENING
-- ----------------------------------------------------------------------------
ALTER TABLE public.character_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_metrics ENABLE ROW LEVEL SECURITY;

-- Clean up legacy policies
DROP POLICY IF EXISTS "Public can view non-hidden reviews" ON public.character_reviews;
DROP POLICY IF EXISTS "Anyone can select character_reviews" ON public.character_reviews;
DROP POLICY IF EXISTS "Users can insert their own review" ON public.character_reviews;
DROP POLICY IF EXISTS "Users can update their own review" ON public.character_reviews;
DROP POLICY IF EXISTS "Users and admins can delete reviews" ON public.character_reviews;
DROP POLICY IF EXISTS "Public can view character_metrics" ON public.character_metrics;
DROP POLICY IF EXISTS "Authenticated can update character_metrics" ON public.character_metrics;

-- 3.1 Policy on character_reviews: Public SELECT (anon & authenticated) for non-hidden reviews
CREATE POLICY "Public can view non-hidden reviews"
ON public.character_reviews
FOR SELECT
TO public
USING (is_hidden IS NOT TRUE OR (auth.uid() IS NOT NULL AND auth.uid()::text = user_id));

-- Backup RLS Policies for character_reviews write operations
CREATE POLICY "Users can insert their own review via RLS fallback"
ON public.character_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id);

CREATE POLICY "Users can update their own review via RLS fallback"
ON public.character_reviews
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND (role = 'admin' OR is_admin IS TRUE)
  )
)
WITH CHECK (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND (role = 'admin' OR is_admin IS TRUE)
  )
);

CREATE POLICY "Users and admins can delete reviews via RLS fallback"
ON public.character_reviews
FOR DELETE
TO authenticated
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND (role = 'admin' OR is_admin IS TRUE)
  )
);

-- 3.2 Policy on character_metrics: Public SELECT ONLY
CREATE POLICY "Public can view character_metrics"
ON public.character_metrics
FOR SELECT
TO public
USING (true);

-- ----------------------------------------------------------------------------
-- 4. INTERNAL METRICS RECALCULATION FUNCTION (PRIVATE)
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
-- 5. RPC: SUBMIT / UPDATE CHARACTER REVIEW (SECURITY DEFINER)
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
  v_username TEXT;
  v_avatar_url TEXT := '';
  v_review_id TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_result JSONB;
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

  -- 3. Fetch verified user metadata from public.profiles (anti-spoofing)
  SELECT
    COALESCE(username, display_name, 'Thành viên'),
    COALESCE(avatar_url, '')
  INTO v_username, v_avatar_url
  FROM public.profiles
  WHERE id::text = v_user_id;

  IF v_username IS NULL OR v_username = '' THEN
    v_username := 'Thành viên ' || SUBSTRING(v_user_id FROM 1 FOR 6);
  END IF;

  -- 4. Construct unique review ID
  v_review_id := 'rev_' || p_character_id || '_' || v_user_id;

  -- 5. Upsert review record with 1 review per user constraint
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
  )
  ON CONFLICT (character_id, user_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    feedback = EXCLUDED.feedback,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = v_now;

  -- 6. Recalculate metrics atomically
  PERFORM public.recalculate_character_metrics_internal(p_character_id);

  -- 7. Return JSON response
  SELECT jsonb_build_object(
    'id', v_review_id,
    'character_id', p_character_id,
    'user_id', v_user_id,
    'username', v_username,
    'avatar_url', v_avatar_url,
    'rating', p_rating,
    'feedback', TRIM(p_feedback),
    'is_hidden', FALSE,
    'created_at', v_now,
    'updated_at', v_now
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: DELETE CHARACTER REVIEW (SECURITY DEFINER)
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
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Bạn chưa đăng nhập.';
  END IF;

  -- Lookup target review details directly from database (do not trust client character_id)
  SELECT user_id, character_id INTO v_owner_id, v_character_id
  FROM public.character_reviews
  WHERE id = p_review_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy bài đánh giá cần xóa.';
  END IF;

  -- Check if caller is review owner OR admin
  SELECT (role = 'admin' OR is_admin IS TRUE) INTO v_is_admin
  FROM public.profiles
  WHERE id::text = v_user_id;

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
-- 7. PERMISSIONS & EXECUTE GRANTS HARDENING
-- ----------------------------------------------------------------------------
-- 7.1 Revoke direct write table access from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON public.character_reviews FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.character_metrics FROM anon, authenticated;

-- 7.2 Grant SELECT access to public
GRANT SELECT ON public.character_reviews TO anon, authenticated;
GRANT SELECT ON public.character_metrics TO anon, authenticated;

-- 7.3 Revoke EXECUTE from PUBLIC / anon on all RPCs
REVOKE EXECUTE ON FUNCTION public.recalculate_character_metrics_internal(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_character_review(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_character_review(TEXT) FROM PUBLIC, anon;

-- 7.4 Grant EXECUTE strictly to authenticated users on public-facing RPCs
GRANT EXECUTE ON FUNCTION public.submit_character_review(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_character_review(TEXT) TO authenticated;

COMMIT;
