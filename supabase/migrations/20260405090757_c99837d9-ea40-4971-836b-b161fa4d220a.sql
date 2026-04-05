
DROP TRIGGER IF EXISTS update_hourly_votes_count ON public.hourly_forecast_votes;

CREATE TRIGGER update_hourly_votes_count
AFTER INSERT OR UPDATE OR DELETE ON public.hourly_forecast_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_hourly_vote_counts();
