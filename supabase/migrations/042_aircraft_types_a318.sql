-- Airbus A318-100 was already in ICAO_TYPE_MAP but had no DB row,
-- causing resolveAircraftTypeId to return null after upload.
-- Primarily operated by Air France (retired) and a few charter carriers.

INSERT INTO aircraft_types
  (icao_code, iata_code, name, manufacturer, category, engine_count, max_pax, range_km)
VALUES
  ('A318', '318', 'Airbus A318-100', 'Airbus', 'Narrow-body', 2, 107, 6000)
ON CONFLICT (icao_code) DO NOTHING;
