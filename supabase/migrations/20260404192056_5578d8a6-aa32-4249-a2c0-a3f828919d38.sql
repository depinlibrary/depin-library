-- Admin config for which projects have hourly predictions
CREATE TABLE public.hourly_forecast_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  cooldown_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.hourly_forecast_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hourly config is publicly readable"
  ON public.hourly_forecast_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage hourly config"
  ON public.hourly_forecast_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Each round of an hourly prediction
CREATE TABLE public.hourly_forecast_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.hourly_forecast_config(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  cooldown_end timestamptz,
  start_price numeric,
  end_price numeric,
  outcome text, -- 'yes' (up), 'no' (down), 'draw'
  total_votes_up integer NOT NULL DEFAULT 0,
  total_votes_down integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'resolving', 'resolved', 'cooldown'))
);

ALTER TABLE public.hourly_forecast_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rounds are publicly readable"
  ON public.hourly_forecast_rounds FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage rounds"
  ON public.hourly_forecast_rounds FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX idx_hourly_rounds_config_status ON public.hourly_forecast_rounds(config_id, status);
CREATE INDEX idx_hourly_rounds_project_status ON public.hourly_forecast_rounds(project_id, status);

-- User votes per round
CREATE TABLE public.hourly_forecast_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.hourly_forecast_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_vote CHECK (vote IN ('up', 'down')),
  UNIQUE(round_id, user_id)
);

ALTER TABLE public.hourly_forecast_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are publicly readable"
  ON public.hourly_forecast_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.hourly_forecast_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update vote counts on hourly_forecast_rounds
CREATE OR REPLACE FUNCTION public.update_hourly_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_up INTEGER;
  v_down INTEGER;
  v_round_id uuid;
BEGIN
  v_round_id := COALESCE(NEW.round_id, OLD.round_id);
  
  SELECT
    COUNT(*) FILTER (WHERE vote = 'up'),
    COUNT(*) FILTER (WHERE vote = 'down')
  INTO v_up, v_down
  FROM hourly_forecast_votes
  WHERE round_id = v_round_id;

  UPDATE hourly_forecast_rounds
  SET total_votes_up = v_up, total_votes_down = v_down
  WHERE id = v_round_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_hourly_votes_count
AFTER INSERT OR DELETE ON public.hourly_forecast_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_hourly_vote_counts();

-- Prevent vote changes (same as regular forecasts)
CREATE OR REPLACE FUNCTION public.prevent_hourly_vote_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Hourly prediction votes are final and cannot be changed.';
END;
$$;

CREATE TRIGGER prevent_hourly_vote_change
BEFORE UPDATE ON public.hourly_forecast_votes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hourly_vote_update();

-- Enable realtime for rounds
ALTER PUBLICATION supabase_realtime ADD TABLE public.hourly_forecast_rounds;