-- Types referenced in the app / catalog but missing from 003_seed (fixes resolveAircraftTypeId for e.g. Airbus A330-300).
INSERT INTO aircraft_types (icao_code, iata_code, name, manufacturer, category, engine_count, max_pax, range_km) VALUES
  ('A332','332','Airbus A330-200','Airbus','Wide-body',2,293,13450),
  ('A333','333','Airbus A330-300','Airbus','Wide-body',2,335,11750),
  ('B773','773','Boeing 777-300','Boeing','Wide-body',2,550,11100),
  ('B739','739','Boeing 737-900','Boeing','Narrow-body',2,220,6045)
ON CONFLICT (icao_code) DO NOTHING;
