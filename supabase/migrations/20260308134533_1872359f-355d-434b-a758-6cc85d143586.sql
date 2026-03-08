
CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  threshold_percent numeric NOT NULL DEFAULT 5,
  direction text NOT NULL DEFAULT 'both' CHECK (direction IN ('up', 'down', 'both')),
  is_enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamp with time zone DEFAULT NULL,
  last_known_price numeric DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all alerts"
  ON public.price_alerts FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
