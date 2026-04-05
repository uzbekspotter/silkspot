-- One-off: bump views for approved photo of A6-EER so Explore primary / ordering favors it.
-- Adds 180 to lifetime view_count and to today's UTC bucket in photo_daily_views.
DO $$
DECLARE
  pid uuid;
  bump integer := 180;
BEGIN
  SELECT p.id INTO pid
  FROM public.photos p
  JOIN public.aircraft a ON a.id = p.aircraft_id
  WHERE upper(trim(a.registration)) = 'A6-EER'
    AND p.status = 'APPROVED'
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF pid IS NULL THEN
    RAISE NOTICE '022_boost_explore_views_a6_eer: no APPROVED photo linked to aircraft A6-EER — skip';
    RETURN;
  END IF;

  UPDATE public.photos
  SET view_count = view_count + bump
  WHERE id = pid;

  INSERT INTO public.photo_daily_views (photo_id, view_date, views)
  VALUES (pid, (timezone('utc', now()))::date, bump)
  ON CONFLICT (photo_id, view_date)
  DO UPDATE SET views = public.photo_daily_views.views + excluded.views;

  RAISE NOTICE '022_boost_explore_views_a6_eer: photo % +% views (lifetime + today UTC)', pid, bump;
END $$;
