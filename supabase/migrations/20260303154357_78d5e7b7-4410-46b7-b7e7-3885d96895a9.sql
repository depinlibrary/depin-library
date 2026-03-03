
-- Create comparison type enum
CREATE TYPE public.comparison_type AS ENUM ('standard', 'custom');

-- Create project_comparisons table
CREATE TABLE public.project_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_a_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_b_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  comparison_type public.comparison_type NOT NULL DEFAULT 'standard',
  user_prompt text,
  normalized_key text NOT NULL,
  ai_response jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index on normalized_key
CREATE UNIQUE INDEX idx_comparisons_normalized_key ON public.project_comparisons(normalized_key);

-- Enable RLS
ALTER TABLE public.project_comparisons ENABLE ROW LEVEL SECURITY;

-- Public read policy (cached comparisons are shared)
CREATE POLICY "Comparisons are publicly readable"
  ON public.project_comparisons FOR SELECT
  USING (true);

-- Service role can manage comparisons
CREATE POLICY "Service role can manage comparisons"
  ON public.project_comparisons FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create comparison_requests table for rate limiting
CREATE TABLE public.comparison_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comparison_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own requests"
  ON public.comparison_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage requests"
  ON public.comparison_requests FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Updated_at trigger
CREATE TRIGGER update_comparisons_updated_at
  BEFORE UPDATE ON public.project_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
