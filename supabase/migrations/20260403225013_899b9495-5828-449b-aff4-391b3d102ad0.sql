
-- Fix 1: Restrict notifications INSERT to own user_id only
-- System/edge functions use service_role which bypasses RLS
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix 2: Restrict rate_limit_state SELECT to service role only
DROP POLICY IF EXISTS "Rate limit state is publicly readable" ON public.rate_limit_state;

CREATE POLICY "Service role can read rate limit state"
  ON public.rate_limit_state
  FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Fix 3: Restrict project-logos uploads
-- Drop existing permissive INSERT policy on storage.objects for project-logos
DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_0" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload project logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project logos" ON storage.objects;

-- Allow admins to upload anywhere in project-logos
CREATE POLICY "Admins can upload project logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-logos'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow authenticated users to upload to their own folder in project-logos (for submissions)
CREATE POLICY "Users can upload submission logos to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
