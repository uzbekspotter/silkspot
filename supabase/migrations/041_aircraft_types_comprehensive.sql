-- Comprehensive aircraft_types additions.
-- Covers variants that were in the UI catalog but had no DB row,
-- causing resolveAircraftTypeId to return null after upload.
--
-- All names match ICAO_TYPE_MAP in src/lib/icao-type-map.ts exactly,
-- so step-2 exact ilike in resolveAircraftTypeId works without fallback.

INSERT INTO aircraft_types
  (icao_code, iata_code, name, manufacturer, category, engine_count, max_pax, range_km)
VALUES
  -- Airbus A330neo family
  ('A338', '338', 'Airbus A330-800neo', 'Airbus',  'Wide-body',   2, 257, 15094),
  ('A339', '339', 'Airbus A330-900neo', 'Airbus',  'Wide-body',   2, 287, 13334),
  -- Airbus A340-600
  ('A346', '346', 'Airbus A340-600',    'Airbus',  'Wide-body',   4, 380, 14450),
  -- Airbus A220 (ex-Bombardier C Series)
  ('CS1',  '221', 'Airbus A220-100',   'Airbus',  'Narrow-body', 2, 135,  5700),
  ('CS3',  '223', 'Airbus A220-300',   'Airbus',  'Narrow-body', 2, 160,  6300),
  -- Boeing 737 family additions
  ('B737', '737', 'Boeing 737-700',    'Boeing',  'Narrow-body', 2, 149,  6370),
  ('B37M', '7M7', 'Boeing 737 MAX 7',  'Boeing',  'Narrow-body', 2, 172,  7130),
  ('B3XM', '7MJ', 'Boeing 737 MAX 10', 'Boeing',  'Narrow-body', 2, 230,  6111),
  -- Boeing 747 cargo
  ('B74F', '74F', 'Boeing 747-400F',   'Boeing',  'Cargo',       4,   0,  8230),
  -- Boeing 767 additions
  ('B762', '762', 'Boeing 767-200',    'Boeing',  'Wide-body',   2, 255,  7130),
  ('B764', '764', 'Boeing 767-400ER',  'Boeing',  'Wide-body',   2, 304, 10415),
  -- Boeing 777 additions
  ('B77F', '77F', 'Boeing 777F',       'Boeing',  'Cargo',       2,   0,  9200),
  ('B779', '779', 'Boeing 777-9',      'Boeing',  'Wide-body',   2, 426, 13500),
  -- Embraer E-Jet E2
  ('E290', '290', 'Embraer E190-E2',   'Embraer', 'Regional',    2,  97,  5278),
  ('E295', '295', 'Embraer E195-E2',   'Embraer', 'Regional',    2, 146,  4200)
ON CONFLICT (icao_code) DO NOTHING;
