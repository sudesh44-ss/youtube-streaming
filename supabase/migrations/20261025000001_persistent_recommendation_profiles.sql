-- Migration: 20261025000001_persistent_recommendation_profiles.sql
-- Description: Creates user_recommendation_profiles table to maintain long-term learned interests
-- across 30-day raw activity retention cleanups.

CREATE TABLE IF NOT EXISTS public.user_recommendation_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_affinities JSONB NOT NULL DEFAULT '{}'::jsonb,
  creator_affinities JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_content_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  liked_content_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_completed_watches INT NOT NULL DEFAULT 0,
  total_watch_seconds BIGINT NOT NULL DEFAULT 0,
  profile_version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_profiles_user ON public.user_recommendation_profiles(user_id);

ALTER TABLE public.user_recommendation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recommendation profile"
  ON public.user_recommendation_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
