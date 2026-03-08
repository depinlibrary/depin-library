CREATE TABLE public.forecast_reply_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL REFERENCES public.forecast_comment_replies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

ALTER TABLE public.forecast_reply_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reply likes are publicly readable" ON public.forecast_reply_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own reply likes" ON public.forecast_reply_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reply likes" ON public.forecast_reply_likes
  FOR DELETE USING (auth.uid() = user_id);