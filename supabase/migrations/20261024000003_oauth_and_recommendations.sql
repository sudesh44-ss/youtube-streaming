-- Migration: 20261024000003_oauth_and_recommendations.sql
-- Description: Creates oauth_connections and content_feedback tables with Row Level Security (RLS)

-- 1. OAuth Connections Table (for Google/YouTube account authorization)
CREATE TABLE IF NOT EXISTS public.oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  refresh_iv TEXT,
  refresh_auth_tag TEXT,
  expires_at BIGINT,
  scope TEXT,
  channel_id TEXT,
  channel_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_user ON public.oauth_connections(user_id);

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own oauth connections"
  ON public.oauth_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Content Feedback Table (Explicit user feedback: not_interested, like, dislike)
CREATE TABLE IF NOT EXISTS public.content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('not_interested', 'like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_id, feedback_type)
);

CREATE INDEX IF NOT EXISTS idx_content_feedback_user ON public.content_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_content_feedback_user_type ON public.content_feedback(user_id, feedback_type);

ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own content feedback"
  ON public.content_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
