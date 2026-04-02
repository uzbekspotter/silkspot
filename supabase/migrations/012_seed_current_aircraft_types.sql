-- SILKSPOT — Migration 012
-- Extend aircraft_types with commonly used current ICAO designators.
-- Safe to run multiple times.

INSERT INTO aircraft_types (icao_code, iata_code, name, manufacturer, category, engine_count, max_pax, range_km) VALUES
  ('A20N','320','Airbus A320neo','Airbus','Narrow-body',2,195,6300),
  ('A19N','319','Airbus A319neo','Airbus','Narrow-body',2,160,6900),
  ('A332','332','Airbus A330-200','Airbus','Wide-body',2,293,13450),
  ('A333','333','Airbus A330-300','Airbus','Wide-body',2,335,11750),
  ('A343','343','Airbus A340-300','Airbus','Wide-body',4,295,12400),
  ('A345','345','Airbus A340-500','Airbus','Wide-body',4,313,16700),
  ('A389','388','Airbus A380-842','Airbus','Wide-body',4,853,15200),
  ('B39M','7M9','Boeing 737 MAX 9','Boeing','Narrow-body',2,220,6570),
  ('B78X','781','Boeing 787-10','Boeing','Wide-body',2,330,11910),
  ('B773','773','Boeing 777-300','Boeing','Wide-body',2,550,11100),
  ('B77L','77L','Boeing 777-200LR','Boeing','Wide-body',2,317,15843),
  ('B752','752','Boeing 757-200','Boeing','Narrow-body',2,239,7222),
  ('E195','E95','Embraer E195','Embraer','Regional',2,124,4260),
  ('E75L','E75','Embraer E175','Embraer','Regional',2,88,3700),
  ('AT72','AT7','ATR 72-600','ATR','Turboprop',2,78,1528),
  ('IL76','IL6','Ilyushin Il-76','Ilyushin','Cargo',4,0,5400),
  ('IL96','IL9','Ilyushin Il-96','Ilyushin','Wide-body',4,300,11000),
  ('T154','TU5','Tupolev Tu-154','Tupolev','Narrow-body',3,180,6600),
  ('T204','TU4','Tupolev Tu-204','Tupolev','Narrow-body',2,210,4300),
  ('AN12','AN1','Antonov An-12','Antonov','Cargo',4,0,3600),
  ('AN24','AN2','Antonov An-24','Antonov','Turboprop',2,50,1800),
  ('AN26','AN2','Antonov An-26','Antonov','Cargo',2,0,1100),
  ('AN72','AN7','Antonov An-72','Antonov','Cargo',2,0,4300),
  ('SU95','SU9','Sukhoi Superjet 100','Sukhoi','Regional',2,108,3048),
  ('MC21','M21','Irkut MC-21','Irkut','Narrow-body',2,211,6400)
ON CONFLICT (icao_code) DO NOTHING;

