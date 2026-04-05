-- Canonical operator name: external APIs often return "Emirates Airline(s)"; app catalog uses "Emirates".
UPDATE public.airlines
SET name = 'Emirates'
WHERE lower(trim(name)) IN ('emirates airline', 'emirates airlines')
   OR lower(trim(name)) LIKE 'emirates airline %'
   OR lower(trim(name)) LIKE 'emirates airlines %';
