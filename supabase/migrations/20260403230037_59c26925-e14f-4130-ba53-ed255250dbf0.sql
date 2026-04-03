
-- RPC to get aggregate vote data for a forecast (no individual user exposure)
CREATE OR REPLACE FUNCTION public.get_forecast_vote_stats(p_forecast_id uuid)
RETURNS TABLE(
  total_yes bigint,
  total_no bigint,
  avg_confidence_yes numeric,
  avg_confidence_no numeric,
  avg_confidence_all numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE vote = 'yes') AS total_yes,
    COUNT(*) FILTER (WHERE vote = 'no') AS total_no,
    ROUND(AVG(confidence_level) FILTER (WHERE vote = 'yes'), 1) AS avg_confidence_yes,
    ROUND(AVG(confidence_level) FILTER (WHERE vote = 'no'), 1) AS avg_confidence_no,
    ROUND(AVG(confidence_level), 1) AS avg_confidence_all
  FROM forecast_votes
  WHERE forecast_id = p_forecast_id;
$$;

-- RPC to get vote history (daily aggregates, no user attribution)
CREATE OR REPLACE FUNCTION public.get_forecast_vote_history(p_forecast_id uuid)
RETURNS TABLE(
  vote_date date,
  yes_count bigint,
  no_count bigint,
  avg_confidence numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS vote_date,
    COUNT(*) FILTER (WHERE vote = 'yes') AS yes_count,
    COUNT(*) FILTER (WHERE vote = 'no') AS no_count,
    ROUND(AVG(confidence_level), 1) AS avg_confidence
  FROM forecast_votes
  WHERE forecast_id = p_forecast_id
  GROUP BY vote_date
  ORDER BY vote_date;
$$;

-- Allow service role to read all votes (for edge functions like notify-forecast-results)
CREATE POLICY "Service role can read all votes"
  ON public.forecast_votes
  FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'service_role');
