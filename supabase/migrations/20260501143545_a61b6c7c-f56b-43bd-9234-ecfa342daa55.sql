-- Add voting lock timestamp to forecasts.
-- When set, voting closes at this time (which must be <= end_date).
-- When NULL, voting stays open until end_date (legacy behavior).
ALTER TABLE public.forecasts
  ADD COLUMN voting_lock_at timestamptz NULL;

-- Allow creators (and admins / service role) to set this field on insert/update.
-- Update the protect trigger so creators can update voting_lock_at as well.
CREATE OR REPLACE FUNCTION public.protect_forecast_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.total_votes_yes IS DISTINCT FROM OLD.total_votes_yes
     OR NEW.total_votes_no IS DISTINCT FROM OLD.total_votes_no
     OR NEW.weighted_votes_yes IS DISTINCT FROM OLD.weighted_votes_yes
     OR NEW.weighted_votes_no IS DISTINCT FROM OLD.weighted_votes_no
     OR NEW.outcome IS DISTINCT FROM OLD.outcome
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.start_price IS DISTINCT FROM OLD.start_price
     OR NEW.prediction_target IS DISTINCT FROM OLD.prediction_target
     OR NEW.prediction_direction IS DISTINCT FROM OLD.prediction_direction
     OR NEW.end_notifications_sent IS DISTINCT FROM OLD.end_notifications_sent
  THEN
    RAISE EXCEPTION 'You can only update title and description of your predictions.';
  END IF;
  RETURN NEW;
END;
$function$;

-- Block votes after voting_lock_at via trigger
CREATE OR REPLACE FUNCTION public.enforce_forecast_vote_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock timestamptz;
  v_end timestamptz;
BEGIN
  SELECT voting_lock_at, end_date INTO v_lock, v_end
  FROM public.forecasts WHERE id = NEW.forecast_id;

  IF v_end IS NOT NULL AND now() >= v_end THEN
    RAISE EXCEPTION 'Voting has ended for this prediction.';
  END IF;

  IF v_lock IS NOT NULL AND now() >= v_lock THEN
    RAISE EXCEPTION 'Voting is closed. Predictions are locked until results are revealed.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_forecast_vote_window_trg ON public.forecast_votes;
CREATE TRIGGER enforce_forecast_vote_window_trg
  BEFORE INSERT ON public.forecast_votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forecast_vote_window();