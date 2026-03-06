
-- 1. Project Ratings (structured multi-category)
CREATE TABLE public.project_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  utility_rating INTEGER NOT NULL CHECK (utility_rating BETWEEN 1 AND 5),
  tokenomics_rating INTEGER NOT NULL CHECK (tokenomics_rating BETWEEN 1 AND 5),
  adoption_rating INTEGER NOT NULL CHECK (adoption_rating BETWEEN 1 AND 5),
  hardware_rating INTEGER NOT NULL CHECK (hardware_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are publicly readable" ON public.project_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings" ON public.project_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.project_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON public.project_ratings FOR DELETE USING (auth.uid() = user_id);

-- 2. Forecasts
CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  project_a_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_b_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  creator_user_id UUID NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  total_votes_yes INTEGER NOT NULL DEFAULT 0,
  total_votes_no INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forecasts are publicly readable" ON public.forecasts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create forecasts" ON public.forecasts FOR INSERT WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "Creators can update own forecasts" ON public.forecasts FOR UPDATE USING (auth.uid() = creator_user_id);

CREATE INDEX idx_forecasts_project_a ON public.forecasts(project_a_id);
CREATE INDEX idx_forecasts_project_b ON public.forecasts(project_b_id);
CREATE INDEX idx_forecasts_status ON public.forecasts(status);
CREATE INDEX idx_forecasts_end_date ON public.forecasts(end_date);

-- 3. Forecast Votes
CREATE TABLE public.forecast_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (forecast_id, user_id)
);

ALTER TABLE public.forecast_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are publicly readable" ON public.forecast_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert own votes" ON public.forecast_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.forecast_votes FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_forecast_votes_forecast ON public.forecast_votes(forecast_id);

-- 4. Project Trending Scores
CREATE TABLE public.project_trending_scores (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_trending_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending scores are publicly readable" ON public.project_trending_scores FOR SELECT USING (true);
CREATE POLICY "Service role can manage trending scores" ON public.project_trending_scores FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 5. Project Sentiment
CREATE TABLE public.project_sentiment (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  bullish_votes INTEGER NOT NULL DEFAULT 0,
  bearish_votes INTEGER NOT NULL DEFAULT 0,
  bullish_percentage NUMERIC NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_sentiment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sentiment is publicly readable" ON public.project_sentiment FOR SELECT USING (true);
CREATE POLICY "Service role can manage sentiment" ON public.project_sentiment FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 6. Function to update forecast vote counts and sentiment
CREATE OR REPLACE FUNCTION public.update_forecast_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_yes INTEGER;
  v_no INTEGER;
  v_forecast RECORD;
  v_project_id UUID;
BEGIN
  -- Get forecast_id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    -- Recount votes for the forecast
    SELECT COUNT(*) FILTER (WHERE vote = 'yes'), COUNT(*) FILTER (WHERE vote = 'no')
    INTO v_yes, v_no
    FROM forecast_votes WHERE forecast_id = OLD.forecast_id;

    UPDATE forecasts SET total_votes_yes = v_yes, total_votes_no = v_no WHERE id = OLD.forecast_id;

    -- Update sentiment for related projects
    SELECT project_a_id, project_b_id INTO v_forecast FROM forecasts WHERE id = OLD.forecast_id;
  ELSE
    SELECT COUNT(*) FILTER (WHERE vote = 'yes'), COUNT(*) FILTER (WHERE vote = 'no')
    INTO v_yes, v_no
    FROM forecast_votes WHERE forecast_id = NEW.forecast_id;

    UPDATE forecasts SET total_votes_yes = v_yes, total_votes_no = v_no WHERE id = NEW.forecast_id;

    SELECT project_a_id, project_b_id INTO v_forecast FROM forecasts WHERE id = NEW.forecast_id;
  END IF;

  -- Update sentiment for project_a
  IF v_forecast.project_a_id IS NOT NULL THEN
    PERFORM update_project_sentiment(v_forecast.project_a_id);
  END IF;

  -- Update sentiment for project_b
  IF v_forecast.project_b_id IS NOT NULL THEN
    PERFORM update_project_sentiment(v_forecast.project_b_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Sentiment update helper
CREATE OR REPLACE FUNCTION public.update_project_sentiment(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_bullish INTEGER;
  v_bearish INTEGER;
  v_total INTEGER;
  v_pct NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN fv.vote = 'yes' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fv.vote = 'no' THEN 1 ELSE 0 END), 0)
  INTO v_bullish, v_bearish
  FROM forecast_votes fv
  JOIN forecasts f ON f.id = fv.forecast_id
  WHERE f.project_a_id = p_project_id OR f.project_b_id = p_project_id;

  v_total := v_bullish + v_bearish;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_bullish::NUMERIC / v_total) * 100, 1) ELSE 0 END;

  INSERT INTO project_sentiment (project_id, bullish_votes, bearish_votes, bullish_percentage, total_votes, updated_at)
  VALUES (p_project_id, v_bullish, v_bearish, v_pct, v_total, now())
  ON CONFLICT (project_id) DO UPDATE SET
    bullish_votes = EXCLUDED.bullish_votes,
    bearish_votes = EXCLUDED.bearish_votes,
    bullish_percentage = EXCLUDED.bullish_percentage,
    total_votes = EXCLUDED.total_votes,
    updated_at = now();
END;
$$;

-- Trigger on forecast_votes
CREATE TRIGGER trg_update_forecast_votes
  AFTER INSERT OR UPDATE OR DELETE ON public.forecast_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_forecast_vote_counts();

-- Updated_at triggers
CREATE TRIGGER trg_project_ratings_updated
  BEFORE UPDATE ON public.project_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for forecasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_sentiment;
