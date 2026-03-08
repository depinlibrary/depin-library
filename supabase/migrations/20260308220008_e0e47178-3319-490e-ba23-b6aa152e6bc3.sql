
CREATE TABLE public.spotlight_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.spotlight_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spotlight projects are publicly readable"
  ON public.spotlight_projects
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage spotlight projects"
  ON public.spotlight_projects
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
