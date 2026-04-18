-- Add Boeing 747-8 Intercontinental (passenger) as a distinct aircraft type.
--
-- ICAO B748 = 747-8F (freighter)  — already in DB (migration 003)
-- ICAO B74I = 747-8I Intercontinental (passenger, Lufthansa / Korean Air / Air China)
--
-- Without this row, adsbdb returning B74I was unresolvable → type_id = null.
-- IATA code '74I' is the standard designator for the passenger variant.

INSERT INTO aircraft_types
  (icao_code, iata_code, name, manufacturer, category, engine_count, max_pax, range_km)
VALUES
  ('B74I', '74I', 'Boeing 747-8', 'Boeing', 'Wide-body', 4, 467, 14815)
ON CONFLICT (icao_code) DO NOTHING;
