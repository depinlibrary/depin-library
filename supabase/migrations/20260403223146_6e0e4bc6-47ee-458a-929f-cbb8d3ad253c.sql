DROP POLICY IF EXISTS "Users can update own votes" ON public.forecast_votes;

CREATE UNIQUE INDEX IF NOT EXISTS forecast_votes_unique_user_vote_idx
ON public.forecast_votes (forecast_id, user_id);

CREATE OR REPLACE FUNCTION public.prevent_forecast_vote_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Votes are final and cannot be changed once submitted.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_forecast_vote_update ON public.forecast_votes;

CREATE TRIGGER prevent_forecast_vote_update
BEFORE UPDATE ON public.forecast_votes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_forecast_vote_update();