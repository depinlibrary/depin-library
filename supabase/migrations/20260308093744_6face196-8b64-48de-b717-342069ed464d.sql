
-- Review likes table
CREATE TABLE public.review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review likes are publicly readable" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON public.review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.review_likes FOR DELETE USING (auth.uid() = user_id);

-- Review replies table
CREATE TABLE public.review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reply_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review replies are publicly readable" ON public.review_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert own replies" ON public.review_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.review_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own replies" ON public.review_replies FOR UPDATE USING (auth.uid() = user_id);
