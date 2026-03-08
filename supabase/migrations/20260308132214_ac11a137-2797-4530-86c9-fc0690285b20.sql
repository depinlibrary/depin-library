
CREATE TABLE public.forecast_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deletion requests" ON public.forecast_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deletion requests" ON public.forecast_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all deletion requests" ON public.forecast_deletion_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deletion requests" ON public.forecast_deletion_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete deletion requests" ON public.forecast_deletion_requests
  FOR DELETE USING (has_role(auth.uid(), 'admin'));
