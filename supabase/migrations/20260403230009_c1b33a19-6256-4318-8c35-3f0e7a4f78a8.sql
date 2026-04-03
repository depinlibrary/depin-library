
-- Fix 1: Restrict forecast creator UPDATE to safe columns only
DROP POLICY IF EXISTS "Creators can update own forecasts" ON public.forecasts;

-- Allow creators to update only title and description
CREATE POLICY "Creators can update own forecast details"
  ON public.forecasts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_user_id)
  WITH CHECK (auth.uid() = creator_user_id);

-- Trigger to block non-service-role from changing sensitive columns
CREATE OR REPLACE FUNCTION public.protect_forecast_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (used by edge functions/triggers) can change anything
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
$$;

DROP TRIGGER IF EXISTS protect_forecast_sensitive_fields ON public.forecasts;
CREATE TRIGGER protect_forecast_sensitive_fields
  BEFORE UPDATE ON public.forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_forecast_sensitive_fields();

-- Fix 2: Restrict forecast_votes SELECT to own votes only
DROP POLICY IF EXISTS "Votes are publicly readable" ON public.forecast_votes;

CREATE POLICY "Users can read own votes"
  ON public.forecast_votes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Fix 3: Restrict project-logos bucket to safe image MIME types and 2MB limit
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    file_size_limit = 2097152
WHERE id = 'project-logos';
