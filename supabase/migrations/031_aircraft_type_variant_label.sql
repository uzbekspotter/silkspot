-- Optional display wording per airframe (BBJ, Prestige, etc.) while type_id stays canonical ICAO row.

ALTER TABLE public.aircraft
  ADD COLUMN IF NOT EXISTS type_variant_label VARCHAR(120);

COMMENT ON COLUMN public.aircraft.type_variant_label IS 'Optional label shown instead of aircraft_types.name (e.g. corporate variant); type_id remains the catalog row for that ICAO.';

-- Append-only: keep type_engine_designator last in the previous definition, add new column after it.
CREATE OR REPLACE VIEW public.aircraft_full AS
SELECT
  a.id,
  a.registration,
  a.msn,
  a.icao_hex,
  a.first_flight,
  a.status,
  a.seat_config,
  a.engines,
  a.is_verified,
  a.photo_count,
  a.created_at,
  a.updated_at,
  t.icao_code    AS type_icao,
  t.name         AS type_name,
  t.manufacturer AS manufacturer,
  t.category     AS type_category,
  ao.airline_id,
  al.name        AS operator_name,
  al.iata        AS operator_iata,
  al.icao        AS operator_icao,
  ao.livery,
  ao.start_date  AS operator_since,
  t.engine_designator AS type_engine_designator,
  a.type_variant_label AS type_variant_label
FROM public.aircraft a
LEFT JOIN public.aircraft_types     t  ON t.id  = a.type_id
LEFT JOIN public.aircraft_operators ao ON ao.aircraft_id = a.id AND ao.end_date IS NULL
LEFT JOIN public.airlines           al ON al.id = ao.airline_id;

ALTER VIEW public.aircraft_full SET (security_invoker = true);

-- Spotters may set/clear variant after they have a photo on the aircraft (or created the row, or are moderator).
CREATE OR REPLACE FUNCTION public.set_my_aircraft_type_variant(
  p_aircraft_id uuid,
  p_type_variant_label text,
  p_fill_type_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_label text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    (public.is_moderator()
     OR a.created_by IS NOT DISTINCT FROM auth.uid()
     OR EXISTS (
       SELECT 1 FROM public.photos p
       WHERE p.aircraft_id = p_aircraft_id AND p.uploader_id = auth.uid()
     ))
  INTO v_ok
  FROM public.aircraft a
  WHERE a.id = p_aircraft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aircraft not found';
  END IF;

  IF NOT COALESCE(v_ok, false) THEN
    RAISE EXCEPTION 'Not allowed to update this aircraft type wording';
  END IF;

  v_label := left(btrim(COALESCE(p_type_variant_label, '')), 120);
  IF v_label = '' THEN
    v_label := NULL;
  END IF;

  UPDATE public.aircraft a
  SET
    type_variant_label = v_label,
    type_id = COALESCE(a.type_id, p_fill_type_id),
    updated_at = now()
  WHERE a.id = p_aircraft_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_aircraft_type_variant(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_aircraft_type_variant(uuid, text, uuid) TO authenticated;
