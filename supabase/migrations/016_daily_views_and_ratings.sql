-- Daily per-photo views (UTC date) for Explore ordering + spotter leaderboard
CREATE TABLE IF NOT EXISTS public.photo_daily_views (
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (photo_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_photo_daily_views_date_views
  ON public.photo_daily_views(view_date DESC, views DESC);

ALTER TABLE public.photo_daily_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_daily_views_select_public"
  ON public.photo_daily_views FOR SELECT USING (true);

-- Bump lifetime + daily view counters (called from app on photo open)
CREATE OR REPLACE FUNCTION public.increment_view_count(photo_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d date := (timezone('utc', now()))::date;
BEGIN
  UPDATE public.photos SET view_count = view_count + 1 WHERE id = photo_id;
  INSERT INTO public.photo_daily_views (photo_id, view_date, views)
  VALUES (photo_id, d, 1)
  ON CONFLICT (photo_id, view_date)
  DO UPDATE SET views = public.photo_daily_views.views + 1;
END;
$$;

-- Star ratings (1–5 per user per photo); aggregates on photos
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS rating_sum INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.photo_ratings (
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, user_id)
);

CREATE OR REPLACE FUNCTION public.maintain_photo_rating_aggregate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.photos
    SET rating_sum = rating_sum + NEW.stars, rating_count = rating_count + 1
    WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stars IS DISTINCT FROM NEW.stars THEN
      UPDATE public.photos
      SET rating_sum = rating_sum - OLD.stars + NEW.stars
      WHERE id = NEW.photo_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.photos
    SET
      rating_sum = GREATEST(0, rating_sum - OLD.stars),
      rating_count = GREATEST(0, rating_count - 1)
    WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS photo_ratings_agg_trigger ON public.photo_ratings;
CREATE TRIGGER photo_ratings_agg_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.photo_ratings
  FOR EACH ROW EXECUTE FUNCTION public.maintain_photo_rating_aggregate();

CREATE OR REPLACE FUNCTION public.photo_ratings_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS photo_ratings_updated_at ON public.photo_ratings;
CREATE TRIGGER photo_ratings_updated_at
  BEFORE UPDATE ON public.photo_ratings
  FOR EACH ROW EXECUTE FUNCTION public.photo_ratings_set_updated_at();

ALTER TABLE public.photo_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_ratings_select_public" ON public.photo_ratings FOR SELECT USING (true);
CREATE POLICY "photo_ratings_insert_own" ON public.photo_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_ratings_update_own" ON public.photo_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "photo_ratings_delete_own" ON public.photo_ratings FOR DELETE USING (auth.uid() = user_id);

-- Spotters with at least one approved photo, ordered by sum of today's views on their photos
CREATE OR REPLACE FUNCTION public.top_spotters_today(limit_n int DEFAULT 48)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  today_views bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.id,
    up.username::text,
    COALESCE(up.display_name, up.username)::text AS display_name,
    up.avatar_url::text,
    COALESCE(SUM(pdv.views), 0)::bigint AS today_views
  FROM public.user_profiles up
  INNER JOIN public.photos p ON p.uploader_id = up.id AND p.status = 'APPROVED'::public.photo_status
  LEFT JOIN public.photo_daily_views pdv ON pdv.photo_id = p.id
    AND pdv.view_date = (timezone('utc', now()))::date
  GROUP BY up.id, up.username, up.display_name, up.avatar_url
  ORDER BY today_views DESC, up.username ASC
  LIMIT COALESCE(NULLIF(limit_n, 0), 48);
$$;

GRANT EXECUTE ON FUNCTION public.top_spotters_today(int) TO anon, authenticated;
