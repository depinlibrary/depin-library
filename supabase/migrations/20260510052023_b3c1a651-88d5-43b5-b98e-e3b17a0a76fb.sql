
-- user_points table
CREATE TABLE public.user_points (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  last_claim_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points row"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- point_transactions log
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_point_transactions_user ON public.point_transactions(user_id, created_at DESC);

-- Claim weekly points (300, once every 7 days)
CREATE OR REPLACE FUNCTION public.claim_weekly_points()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_points%ROWTYPE;
  v_amount integer := 300;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.user_points WHERE user_id = v_uid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_points(user_id, balance, last_claim_at)
    VALUES (v_uid, v_amount, now())
    RETURNING * INTO v_row;
    INSERT INTO public.point_transactions(user_id, amount, reason)
    VALUES (v_uid, v_amount, 'weekly_claim');
    RETURN jsonb_build_object('success', true, 'balance', v_row.balance, 'claimed', v_amount);
  END IF;

  IF v_row.last_claim_at IS NOT NULL AND v_row.last_claim_at > now() - interval '7 days' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'too_soon',
      'next_claim_at', v_row.last_claim_at + interval '7 days',
      'balance', v_row.balance
    );
  END IF;

  UPDATE public.user_points
  SET balance = balance + v_amount, last_claim_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  INSERT INTO public.point_transactions(user_id, amount, reason)
  VALUES (v_uid, v_amount, 'weekly_claim');

  RETURN jsonb_build_object('success', true, 'balance', v_row.balance, 'claimed', v_amount);
END;
$$;

-- Spend points atomically; refuses if insufficient
CREATE OR REPLACE FUNCTION public.spend_points(_amount integer, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_points%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT * INTO v_row FROM public.user_points WHERE user_id = v_uid FOR UPDATE;

  IF NOT FOUND OR v_row.balance < _amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient',
      'balance', COALESCE(v_row.balance, 0)
    );
  END IF;

  UPDATE public.user_points
  SET balance = balance - _amount
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  INSERT INTO public.point_transactions(user_id, amount, reason)
  VALUES (v_uid, -_amount, _reason);

  RETURN jsonb_build_object('success', true, 'balance', v_row.balance);
END;
$$;
