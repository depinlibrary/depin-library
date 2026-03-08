
-- Create forecast_comments table
CREATE TABLE public.forecast_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forecast_comments ENABLE ROW LEVEL SECURITY;

-- Comments are publicly readable
CREATE POLICY "Comments are publicly readable"
  ON public.forecast_comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Users can insert own comments"
  ON public.forecast_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own comments
CREATE POLICY "Users can update own comments"
  ON public.forecast_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own comments"
  ON public.forecast_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.forecast_comments;
