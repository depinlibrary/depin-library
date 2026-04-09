
-- Infrastructure stats table for DePIN projects
CREATE TABLE public.project_infrastructure (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  icon_name text DEFAULT NULL,
  link_url text DEFAULT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint to avoid duplicate labels per project
CREATE UNIQUE INDEX idx_project_infrastructure_unique ON public.project_infrastructure(project_id, label);

-- Enable RLS
ALTER TABLE public.project_infrastructure ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Infrastructure data is publicly readable"
  ON public.project_infrastructure FOR SELECT TO public
  USING (true);

-- Admin management
CREATE POLICY "Admins can manage infrastructure"
  ON public.project_infrastructure FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
