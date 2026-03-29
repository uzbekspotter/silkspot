-- ============================================================
-- SILKSPOT — Migration 004
-- Add seat config + engines to aircraft table
-- ============================================================

ALTER TABLE aircraft
  ADD COLUMN IF NOT EXISTS seat_config       VARCHAR(60),
  ADD COLUMN IF NOT EXISTS engines           VARCHAR(120),
  ADD COLUMN IF NOT EXISTS contributor_note  TEXT,
  ADD COLUMN IF NOT EXISTS updated_by        UUID REFERENCES auth.users(id);

-- ============================================================
-- VIEW: aircraft_full
-- ============================================================
CREATE OR REPLACE VIEW aircraft_full AS
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
  ao.start_date  AS operator_since
FROM aircraft a
LEFT JOIN aircraft_types     t  ON t.id  = a.type_id
LEFT JOIN aircraft_operators ao ON ao.aircraft_id = a.id AND ao.end_date IS NULL
LEFT JOIN airlines           al ON al.id = ao.airline_id;

-- ============================================================
-- FUNCTION: lookup_aircraft
-- ============================================================
CREATE OR REPLACE FUNCTION lookup_aircraft(p_reg TEXT)
RETURNS TABLE (
  registration  TEXT,
  msn           TEXT,
  first_flight  DATE,
  status        aircraft_status,
  seat_config   TEXT,
  engines       TEXT,
  type_icao     TEXT,
  type_name     TEXT,
  manufacturer  TEXT,
  operator_name TEXT,
  operator_iata TEXT,
  is_verified   BOOLEAN
) LANGUAGE sql STABLE AS $$
  SELECT
    af.registration::TEXT,
    af.msn::TEXT,
    af.first_flight,
    af.status,
    af.seat_config::TEXT,
    af.engines::TEXT,
    af.type_icao::TEXT,
    af.type_name::TEXT,
    af.manufacturer::TEXT,
    af.operator_name::TEXT,
    af.operator_iata::TEXT,
    af.is_verified
  FROM aircraft_full af
  WHERE UPPER(af.registration) = UPPER(p_reg)
  LIMIT 1;
$$;

-- ============================================================
-- RLS
-- ============================================================
CREATE POLICY "spotters_can_update_aircraft_details"
  ON aircraft FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTION: contribute_aircraft_data
-- ============================================================
CREATE OR REPLACE FUNCTION contribute_aircraft_data(
  p_registration TEXT,
  p_msn          TEXT DEFAULT NULL,
  p_first_flight DATE DEFAULT NULL,
  p_seat_config  TEXT DEFAULT NULL,
  p_engines      TEXT DEFAULT NULL,
  p_status       TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM aircraft
  WHERE UPPER(registration) = UPPER(p_registration);

  IF v_id IS NULL THEN
    INSERT INTO aircraft (
      registration, msn, first_flight, seat_config,
      engines, status, is_verified, updated_by
    ) VALUES (
      UPPER(p_registration),
      p_msn,
      p_first_flight,
      p_seat_config,
      p_engines,
      COALESCE(p_status::aircraft_status, 'ACTIVE'),
      false,
      auth.uid()
    )
    ON CONFLICT (registration) DO NOTHING;
  ELSE
    UPDATE aircraft SET
      msn          = COALESCE(msn,          p_msn),
      first_flight = COALESCE(first_flight, p_first_flight),
      seat_config  = COALESCE(seat_config,  p_seat_config),
      engines      = COALESCE(engines,      p_engines),
      status       = COALESCE(status,       p_status::aircraft_status),
      updated_at   = now(),
      updated_by   = auth.uid()
    WHERE id = v_id
      AND is_verified = false;
  END IF;
END;
$$;
