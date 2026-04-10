-- PG: CREATE OR REPLACE VIEW cannot insert a new column in the middle of the column list
-- (error 42P16: cannot change name of view column ...). Append-only: type_engine_designator last.
-- Safe if 029 view statement failed after ALTER TABLE added engine_designator.

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
  t.engine_designator AS type_engine_designator
FROM public.aircraft a
LEFT JOIN public.aircraft_types     t  ON t.id  = a.type_id
LEFT JOIN public.aircraft_operators ao ON ao.aircraft_id = a.id AND ao.end_date IS NULL
LEFT JOIN public.airlines           al ON al.id = ao.airline_id;

ALTER VIEW public.aircraft_full SET (security_invoker = true);
