-- Owner can correct shot airport, date, and category after upload (pending / approved / rejected).
-- Direct UPDATE on approved photos is blocked by RLS; this SECURITY DEFINER RPC validates ownership.

CREATE OR REPLACE FUNCTION public.update_my_photo_shot_details(
  p_photo_id uuid,
  p_airport_iata text,
  p_shot_date date,
  p_category text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uploader uuid;
  v_status   public.photo_status;
  old_airport uuid;
  ap_id       uuid;
  v_code      text;
  new_cat    public.photo_category;
BEGIN
  new_cat := NULL;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT uploader_id, status, airport_id
  INTO v_uploader, v_status, old_airport
  FROM photos
  WHERE id = p_photo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photo not found';
  END IF;

  IF v_uploader IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your photo';
  END IF;

  IF v_status NOT IN ('PENDING', 'APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Cannot edit metadata for this photo status';
  END IF;

  IF p_shot_date IS NULL THEN
    RAISE EXCEPTION 'Shot date is required';
  END IF;

  ap_id := NULL;
  IF p_airport_iata IS NOT NULL AND btrim(p_airport_iata) <> '' THEN
    v_code := upper(btrim(p_airport_iata));
    SELECT a.id INTO ap_id
    FROM airports a
    WHERE a.iata IS NOT NULL
      AND btrim(a.iata::text) <> ''
      AND upper(btrim(a.iata::text)) = v_code
    LIMIT 1;

    IF ap_id IS NULL AND length(v_code) = 4 THEN
      SELECT a.id INTO ap_id
      FROM airports a
      WHERE a.icao IS NOT NULL
        AND btrim(a.icao::text) <> ''
        AND upper(btrim(a.icao::text)) = v_code
      LIMIT 1;
    END IF;

    IF ap_id IS NULL THEN
      RAISE EXCEPTION 'Airport not found for code %', v_code;
    END IF;
  END IF;

  IF p_category IS NOT NULL AND btrim(p_category) <> '' THEN
    new_cat := btrim(p_category)::public.photo_category;
  END IF;

  UPDATE photos
  SET
    airport_id = ap_id,
    shot_date = p_shot_date,
    category = COALESCE(new_cat, category),
    updated_at = now()
  WHERE id = p_photo_id;

  IF v_status = 'APPROVED'::public.photo_status AND old_airport IS DISTINCT FROM ap_id THEN
    IF old_airport IS NOT NULL THEN
      UPDATE airports
      SET photo_count = GREATEST(photo_count - 1, 0)
      WHERE id = old_airport;
    END IF;
    IF ap_id IS NOT NULL THEN
      UPDATE airports SET photo_count = photo_count + 1 WHERE id = ap_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_photo_shot_details(uuid, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_photo_shot_details(uuid, text, date, text) TO authenticated;
