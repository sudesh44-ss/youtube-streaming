-- OmniDiscover Supabase PostgreSQL Schema & Row Level Security (RLS) Migrations

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_mode TEXT DEFAULT 'normal' CHECK (default_mode IN ('normal', 'category')),
  preferred_categories JSONB DEFAULT '["technology","music"]'::jsonb,
  preferred_languages JSONB DEFAULT '["en"]'::jsonb,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system')),
  layout_density TEXT DEFAULT 'comfortable' CHECK (layout_density IN ('comfortable', 'compact')),
  reduced_motion BOOLEAN DEFAULT FALSE,
  high_contrast BOOLEAN DEFAULT FALSE,
  font_scale TEXT DEFAULT 'medium' CHECK (font_scale IN ('small', 'medium', 'large')),
  email_alerts BOOLEAN DEFAULT TRUE,
  security_alerts BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Provider Credentials Table (Encrypted YouTube & TMDB keys)
CREATE TABLE IF NOT EXISTS public.provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL CHECK (provider_id IN ('youtube', 'tmdb')),
  encrypted_secret TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'disconnected',
  masked_key TEXT NOT NULL,
  last_validated_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_credentials_user ON public.provider_credentials(user_id);

ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own provider credentials"
  ON public.provider_credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Watchlist / Saved Content Table
CREATE TABLE IF NOT EXISTS public.saved_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  external_url TEXT,
  metadata JSONB,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, content_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_content_user ON public.saved_content(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_content_category ON public.saved_content(user_id, category);

ALTER TABLE public.saved_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved content"
  ON public.saved_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved content"
  ON public.saved_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved content"
  ON public.saved_content FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Watch History & Playback Progress Table (Continue Watching)
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'youtube',
  title TEXT NOT NULL,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INT DEFAULT 0,
  progress_seconds INT NOT NULL DEFAULT 0,
  progress_percent INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, content_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_updated ON public.watch_history(user_id, updated_at DESC);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watch history"
  ON public.watch_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Search History Table
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category TEXT,
  mode TEXT NOT NULL DEFAULT 'normal',
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own search history"
  ON public.search_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Security Logs Table (Service Role only write, user cannot tamper)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.security_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 8. Auto-provision profile and preferences on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, display_name, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
