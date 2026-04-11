-- Daily cap on new photo rows per uploader (UTC calendar day).
-- After migration 034, the limit is read from public.app_settings (this file uses 50 until then).

CREATE OR REPLACE FUNCTION public.enforce_photos_daily_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lim int := 50;
  cnt int;
BEGIN
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

DROP TRIGGER IF EXISTS photos_daily_upload_limit ON public.photos;
CREATE TRIGGER photos_daily_upload_limit
  BEFORE INSERT ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_photos_daily_upload_limit();
