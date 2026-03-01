-- Add social media and logo columns to project_submissions
ALTER TABLE public.project_submissions
  ADD COLUMN IF NOT EXISTS twitter_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Add social media columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS twitter_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_url text NOT NULL DEFAULT '';

-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for logos
CREATE POLICY "Project logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-logos');

-- Authenticated users can upload logos
CREATE POLICY "Authenticated users can upload project logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-logos');

-- Admins can delete logos
CREATE POLICY "Admins can delete project logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-logos' AND public.has_role(auth.uid(), 'admin'));