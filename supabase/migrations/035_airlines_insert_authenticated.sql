-- Client resolveOperatorId() inserts missing airlines from the static catalog (or synthetic ICAO).
-- Migration 027 only allowed SELECT; without INSERT, any operator not already in DB always failed.

CREATE POLICY "airlines_insert_authenticated"
  ON public.airlines
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Common operator missing from early seeds (helps cold DBs even before first client insert).
INSERT INTO airlines (iata, icao, name, country_code, hub_iata, alliance, founded_year, status) VALUES
  ('NZ', 'ANZ', 'Air New Zealand', 'NZ', 'AKL', 'Star Alliance', 1940, 'ACTIVE')
ON CONFLICT (icao) DO NOTHING;
