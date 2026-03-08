
-- Forecast comment likes table
CREATE TABLE public.forecast_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.forecast_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.forecast_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forecast comment likes are publicly readable" ON public.forecast_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own forecast comment likes" ON public.forecast_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forecast comment likes" ON public.forecast_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Forecast comment replies table
CREATE TABLE public.forecast_comment_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.forecast_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forecast comment replies are publicly readable" ON public.forecast_comment_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert own forecast comment replies" ON public.forecast_comment_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forecast comment replies" ON public.forecast_comment_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own forecast comment replies" ON public.forecast_comment_replies FOR UPDATE USING (auth.uid() = user_id);
