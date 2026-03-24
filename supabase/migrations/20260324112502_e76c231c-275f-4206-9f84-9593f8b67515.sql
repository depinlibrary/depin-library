
-- Add weighted vote columns (default 0)
ALTER TABLE public.forecasts
  ADD COLUMN IF NOT EXISTS weighted_votes_yes numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weighted_votes_no numeric NOT NULL DEFAULT 0;

-- Replace the trigger function to also compute weighted sums
CREATE OR REPLACE FUNCTION public.update_forecast_vote_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_yes INTEGER;
  v_no INTEGER;
  v_weighted_yes NUMERIC;
  v_weighted_no NUMERIC;
  v_forecast RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT
      COUNT(*) FILTER (WHERE vote = 'yes'),
      COUNT(*) FILTER (WHERE vote = 'no'),
      COALESCE(SUM(COALESCE(confidence_level, 3)) FILTER (WHERE vote = 'yes'), 0),
      COALESCE(SUM(COALESCE(confidence_level, 3)) FILTER (WHERE vote = 'no'), 0)
    INTO v_yes, v_no, v_weighted_yes, v_weighted_no
    FROM forecast_votes WHERE forecast_id = OLD.forecast_id;

    UPDATE forecasts
    SET total_votes_yes = v_yes,
        total_votes_no = v_no,
        weighted_votes_yes = v_weighted_yes,
        weighted_votes_no = v_weighted_no
    WHERE id = OLD.forecast_id;

    SELECT project_a_id, project_b_id INTO v_forecast FROM forecasts WHERE id = OLD.forecast_id;
  ELSE
    SELECT
      COUNT(*) FILTER (WHERE vote = 'yes'),
      COUNT(*) FILTER (WHERE vote = 'no'),
      COALESCE(SUM(COALESCE(confidence_level, 3)) FILTER (WHERE vote = 'yes'), 0),
      COALESCE(SUM(COALESCE(confidence_level, 3)) FILTER (WHERE vote = 'no'), 0)
    INTO v_yes, v_no, v_weighted_yes, v_weighted_no
    FROM forecast_votes WHERE forecast_id = NEW.forecast_id;

    UPDATE forecasts
    SET total_votes_yes = v_yes,
        total_votes_no = v_no,
        weighted_votes_yes = v_weighted_yes,
        weighted_votes_no = v_weighted_no
    WHERE id = NEW.forecast_id;

    SELECT project_a_id, project_b_id INTO v_forecast FROM forecasts WHERE id = NEW.forecast_id;
  END IF;

  IF v_forecast.project_a_id IS NOT NULL THEN
    PERFORM update_project_sentiment(v_forecast.project_a_id);
  END IF;
  IF v_forecast.project_b_id IS NOT NULL THEN
    PERFORM update_project_sentiment(v_forecast.project_b_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Backfill existing forecasts with weighted values
UPDATE forecasts f SET
  weighted_votes_yes = COALESCE((
    SELECT SUM(COALESCE(fv.confidence_level, 3))
    FROM forecast_votes fv
    WHERE fv.forecast_id = f.id AND fv.vote = 'yes'
  ), 0),
  weighted_votes_no = COALESCE((
    SELECT SUM(COALESCE(fv.confidence_level, 3))
    FROM forecast_votes fv
    WHERE fv.forecast_id = f.id AND fv.vote = 'no'
  ), 0);
