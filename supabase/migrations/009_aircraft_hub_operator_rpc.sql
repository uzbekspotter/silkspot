-- Home base IATA on aircraft (optional; airline hub stays on airlines.hub_iata).
ALTER TABLE aircraft
  ADD COLUMN IF NOT EXISTS home_hub_iata CHAR(3);

COMMENT ON COLUMN aircraft.home_hub_iata IS 'Optional spotter-defined base/hub IATA';

-- Creators/mods can set operator on all APPROVED photos for an aircraft (RLS blocks direct photo updates).
CREATE OR REPLACE FUNCTION public.set_operator_for_aircraft_photos(
  p_aircraft_id UUID,
  p_airline_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM aircraft a
    WHERE a.id = p_aircraft_id
      AND (
        (a.created_by IS NOT NULL AND a.created_by = auth.uid())
        OR public.is_moderator()
      )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE photos
  SET operator_id = p_airline_id
  WHERE aircraft_id = p_aircraft_id
    AND status = 'APPROVED';
END;
$$;

REVOKE ALL ON FUNCTION public.set_operator_for_aircraft_photos(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_operator_for_aircraft_photos(UUID, UUID) TO authenticated;
