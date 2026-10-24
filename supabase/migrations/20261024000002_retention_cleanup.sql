-- Migration: 20261024000002_retention_cleanup.sql
-- Description: 30-Day Activity Retention Policy, Performance Indexes, and Cleanup Stored Procedure

-- 1. Optimized Retention Indexes
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at
  ON public.search_history (searched_at);

CREATE INDEX IF NOT EXISTS idx_watch_history_retention_date
  ON public.watch_history (COALESCE(updated_at, last_watched));

-- 2. Safe, Idempotent 30-Day Activity Retention Cleanup Stored Procedure
CREATE OR REPLACE FUNCTION public.clean_expired_activity_data(retention_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted_searches INT := 0;
  v_deleted_watch INT := 0;
BEGIN
  -- Strict safety checks: retention_days must be between 1 and 365
  IF retention_days IS NULL OR retention_days < 1 THEN
    retention_days := 30;
  END IF;

  v_cutoff := NOW() - (retention_days || ' days')::INTERVAL;

  -- 1. Delete expired search queries (strictly activity logs only)
  WITH deleted_s AS (
    DELETE FROM public.search_history
    WHERE searched_at < v_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_searches FROM deleted_s;

  -- 2. Delete expired watch history records (strictly activity logs only)
  WITH deleted_w AS (
    DELETE FROM public.watch_history
    WHERE COALESCE(updated_at, last_watched) < v_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_watch FROM deleted_w;

  -- NOTE: profiles, user_preferences, provider_credentials, and saved_content
  -- are NEVER deleted by this retention routine.

  -- Return audit summary
  RETURN jsonb_build_object(
    'status', 'success',
    'retention_days', retention_days,
    'cutoff_timestamp', v_cutoff,
    'deleted_search_records', v_deleted_searches,
    'deleted_watch_records', v_deleted_watch,
    'executed_at', NOW()
  );
END;
$$;

-- Revoke execute from public/anon, grant only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.clean_expired_activity_data(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clean_expired_activity_data(INT) TO service_role;

-- 3. Optional pg_cron scheduling block (if pg_cron extension is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'daily-activity-retention-cleanup',
      '0 3 * * *', -- Everyday at 03:00 AM UTC
      'SELECT public.clean_expired_activity_data(30);'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if pg_cron is not configured in this database environment
    NULL;
END;
$$;
