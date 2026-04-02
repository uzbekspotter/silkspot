-- CHAR(3) is stored as bpchar with padding; Supabase UI and clients often struggle with it.
ALTER TABLE aircraft
  ALTER COLUMN home_hub_iata TYPE VARCHAR(3)
  USING NULLIF(TRIM(BOTH FROM home_hub_iata::text), '');
