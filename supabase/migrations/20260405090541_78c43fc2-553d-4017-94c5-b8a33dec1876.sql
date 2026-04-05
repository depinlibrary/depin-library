
DROP TRIGGER IF EXISTS prevent_hourly_vote_change ON public.hourly_forecast_votes;
DROP FUNCTION IF EXISTS public.prevent_hourly_vote_update() CASCADE;
