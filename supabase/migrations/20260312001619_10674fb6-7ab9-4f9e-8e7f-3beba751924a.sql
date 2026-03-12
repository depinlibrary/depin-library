
-- Table to store which analysis dimensions a forecast tracks
CREATE TABLE public.forecast_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  dimension text NOT NULL, -- 'market_cap', 'token_price', 'active_nodes', 'revenue'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(forecast_id, dimension)
);

ALTER TABLE public.forecast_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forecast targets are publicly readable" ON public.forecast_targets
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert targets for own forecasts" ON public.forecast_targets
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forecasts f
      WHERE f.id = forecast_id AND f.creator_user_id = auth.uid()
    )
  );

-- Table to store metric snapshots at forecast start and end
CREATE TABLE public.forecast_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  dimension text NOT NULL,
  snapshot_type text NOT NULL DEFAULT 'start', -- 'start' or 'end'
  value numeric,
  source text DEFAULT 'coingecko',
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(forecast_id, dimension, snapshot_type)
);

ALTER TABLE public.forecast_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Metric snapshots are publicly readable" ON public.forecast_metric_snapshots
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role can manage snapshots" ON public.forecast_metric_snapshots
  FOR ALL TO public
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
