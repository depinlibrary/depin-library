
CREATE OR REPLACE FUNCTION public.enforce_spotlight_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.spotlight_projects) >= 6 THEN
    RAISE EXCEPTION 'Maximum of 6 spotlight projects allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_spotlight_limit
  BEFORE INSERT ON public.spotlight_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_spotlight_limit();
