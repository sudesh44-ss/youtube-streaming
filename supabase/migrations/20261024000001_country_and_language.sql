-- Migration: Add country preference to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
