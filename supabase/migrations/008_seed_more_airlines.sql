-- Airlines often missing from early seed; helps operator resolution and FK links.
INSERT INTO airlines (iata, icao, name, country_code, hub_iata, alliance, founded_year, status) VALUES
  ('UA', 'UAL', 'United Airlines',  'US', 'ORD', 'Star Alliance', 1926, 'ACTIVE'),
  ('HU', 'CHH', 'Hainan Airlines',  'CN', NULL, NULL,            1993, 'ACTIVE'),
  ('QR', 'QTR', 'Qatar Airways',    NULL, NULL, 'oneworld',      1994, 'ACTIVE')
ON CONFLICT (icao) DO NOTHING;
