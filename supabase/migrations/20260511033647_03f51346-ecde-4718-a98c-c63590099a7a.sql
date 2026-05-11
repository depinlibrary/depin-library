
ALTER TABLE public.user_points
ADD COLUMN IF NOT EXISTS last_dismissed_window timestamptz;

CREATE OR REPLACE FUNCTION public.dismiss_weekly_claim()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_points%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.user_points WHERE user_id = v_uid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_points(user_id, balance, last_claim_at, last_dismissed_window)
    VALUES (v_uid, 0, NULL, '-infinity'::timestamptz)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.user_points
    SET last_dismissed_window = COALESCE(v_row.last_claim_at, '-infinity'::timestamptz)
    WHERE user_id = v_uid
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
