
-- Add coingecko_id to projects table
ALTER TABLE public.projects ADD COLUMN coingecko_id text DEFAULT NULL;

-- Create token_market_data table
CREATE TABLE public.token_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  price_usd numeric DEFAULT NULL,
  market_cap_usd numeric DEFAULT NULL,
  price_change_24h numeric DEFAULT NULL,
  last_updated timestamp with time zone DEFAULT now(),
  data_source text NOT NULL DEFAULT 'coingecko',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.token_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Token market data is publicly readable"
ON public.token_market_data FOR SELECT USING (true);

CREATE POLICY "Service role can manage token market data"
ON public.token_market_data FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create rate_limit_state table
CREATE TABLE public.rate_limit_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_rate_limited boolean NOT NULL DEFAULT false,
  rate_limited_until timestamp with time zone DEFAULT NULL,
  last_attempt timestamp with time zone DEFAULT NULL,
  backoff_minutes integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rate limit state is publicly readable"
ON public.rate_limit_state FOR SELECT USING (true);

CREATE POLICY "Service role can manage rate limit state"
ON public.rate_limit_state FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Insert default rate limit state row
INSERT INTO public.rate_limit_state (is_rate_limited, backoff_minutes) VALUES (false, 15);

-- Add updated_at triggers
CREATE TRIGGER update_token_market_data_updated_at
BEFORE UPDATE ON public.token_market_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rate_limit_state_updated_at
BEFORE UPDATE ON public.rate_limit_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for token_market_data
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_market_data;
