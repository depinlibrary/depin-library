
REVOKE EXECUTE ON FUNCTION public.claim_weekly_points() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_points(integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_weekly_points() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_points(integer, text) TO authenticated;
