
CREATE OR REPLACE FUNCTION public.protect_forecast_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow nested triggers (e.g. update_forecast_vote_counts updating totals)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Service role (used by edge functions) can change anything
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admin role can change anything
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive fields for regular users
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
