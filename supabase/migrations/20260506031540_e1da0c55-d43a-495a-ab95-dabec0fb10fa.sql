
-- Drop triggers first
DROP TRIGGER IF EXISTS update_forecast_vote_counts_trg ON public.forecast_votes;
DROP TRIGGER IF EXISTS prevent_forecast_vote_update_trg ON public.forecast_votes;
DROP TRIGGER IF EXISTS enforce_forecast_vote_window_trg ON public.forecast_votes;
DROP TRIGGER IF EXISTS protect_forecast_sensitive_fields_trg ON public.forecasts;
DROP TRIGGER IF EXISTS update_hourly_vote_counts_trg ON public.hourly_forecast_votes;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_forecast_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_forecast_vote_update() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_forecast_vote_window() CASCADE;
DROP FUNCTION IF EXISTS public.protect_forecast_sensitive_fields() CASCADE;
DROP FUNCTION IF EXISTS public.update_hourly_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS public.update_project_sentiment(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_forecast_vote_history(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_forecast_vote_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_forecast_duplicate(uuid, uuid, text, timestamptz, text, uuid) CASCADE;

-- Drop tables (CASCADE handles FKs and policies)
DROP TABLE IF EXISTS public.forecast_reply_likes CASCADE;
DROP TABLE IF EXISTS public.forecast_comment_likes CASCADE;
DROP TABLE IF EXISTS public.forecast_comment_replies CASCADE;
DROP TABLE IF EXISTS public.forecast_comments CASCADE;
DROP TABLE IF EXISTS public.forecast_votes CASCADE;
DROP TABLE IF EXISTS public.forecast_targets CASCADE;
DROP TABLE IF EXISTS public.forecast_metric_snapshots CASCADE;
DROP TABLE IF EXISTS public.forecast_deletion_requests CASCADE;
DROP TABLE IF EXISTS public.forecasts CASCADE;
DROP TABLE IF EXISTS public.hourly_forecast_votes CASCADE;
DROP TABLE IF EXISTS public.hourly_forecast_rounds CASCADE;
DROP TABLE IF EXISTS public.hourly_forecast_config CASCADE;
DROP TABLE IF EXISTS public.project_sentiment CASCADE;

-- Remove prediction-related notification preference columns
ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS forecast_vote,
  DROP COLUMN IF EXISTS forecast_result,
  DROP COLUMN IF EXISTS forecast_comment_like,
  DROP COLUMN IF EXISTS forecast_comment_reply,
  DROP COLUMN IF EXISTS forecast_new_comment;
