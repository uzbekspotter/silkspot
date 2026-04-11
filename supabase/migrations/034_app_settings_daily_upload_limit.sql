-- Singleton site settings (row id=1). daily_photo_upload_limit NULL = no daily cap (per user, UTC day).

CREATE TABLE public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  CONSTRAINT app_settings_singleton CHECK (id = 1),
  daily_photo_upload_limit integer
    CHECK (daily_photo_upload_limit IS NULL OR (daily_photo_upload_limit >= 1 AND daily_photo_upload_limit <= 50000)),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, daily_photo_upload_limit)
VALUES (1, 50)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_public"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "app_settings_update_admin"
  ON public.app_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.enforce_photos_daily_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lim int;
  cnt int;
BEGIN
  SELECT daily_photo_upload_limit INTO lim
  FROM public.app_settings
  WHERE id = 1;

  IF lim IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int INTO cnt
  FROM public.photos
  WHERE uploader_id = NEW.uploader_id
    AND (created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date;

  IF cnt >= lim THEN
    RAISE EXCEPTION 'Daily upload limit of % photos (UTC calendar day) reached. Try again tomorrow.', lim
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
