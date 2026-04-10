-- ICAO Doc 8643 aircraft type description (e.g. L2J), from CSV column Engines.
ALTER TABLE public.aircraft_types
  ADD COLUMN IF NOT EXISTS engine_designator VARCHAR(12);

COMMENT ON COLUMN public.aircraft_types.engine_designator IS 'ICAO type description: category + engine count + engine type (e.g. L2J, H2T).';

-- Extend aircraft_full for consumers that read the view.
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
  t.engine_designator AS type_engine_designator,
  ao.airline_id,
  al.name        AS operator_name,
  al.iata        AS operator_iata,
  al.icao        AS operator_icao,
  ao.livery,
  ao.start_date  AS operator_since
FROM public.aircraft a
LEFT JOIN public.aircraft_types     t  ON t.id  = a.type_id
LEFT JOIN public.aircraft_operators ao ON ao.aircraft_id = a.id AND ao.end_date IS NULL
LEFT JOIN public.airlines           al ON al.id = ao.airline_id;

ALTER VIEW public.aircraft_full SET (security_invoker = true);
