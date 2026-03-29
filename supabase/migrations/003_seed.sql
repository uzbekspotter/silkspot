-- ============================================================
-- SkyGrid Pro — Seed Data
-- Migration 003: Reference data
-- ============================================================

-- Countries (subset)
INSERT INTO countries (code, name, flag_emoji) VALUES
  ('US','United States','🇺🇸'),('GB','United Kingdom','🇬🇧'),('DE','Germany','🇩🇪'),
  ('FR','France','🇫🇷'),('AE','United Arab Emirates','🇦🇪'),('JP','Japan','🇯🇵'),
  ('UZ','Uzbekistan','🇺🇿'),('RU','Russia','🇷🇺'),('NL','Netherlands','🇳🇱'),
  ('SG','Singapore','🇸🇬'),('AU','Australia','🇦🇺'),('TR','Turkey','🇹🇷'),
  ('KZ','Kazakhstan','🇰🇿'),('UA','Ukraine','🇺🇦'),('IN','India','🇮🇳'),
  ('CN','China','🇨🇳'),('BR','Brazil','🇧🇷'),('ZA','South Africa','🇿🇦'),
  ('KR','South Korea','🇰🇷'),('PL','Poland','🇵🇱'),('AT','Austria','🇦🇹'),
  ('NG','Nigeria','🇳🇬'),('MX','Mexico','🇲🇽'),('HK','Hong Kong','🇭🇰')
ON CONFLICT (code) DO NOTHING;

-- Aircraft types
INSERT INTO aircraft_types (icao_code, iata_code, name, manufacturer, category, engine_count, max_pax, range_km) VALUES
  ('B789','789','Boeing 787-9 Dreamliner','Boeing','Wide-body',2,296,14140),
  ('B788','788','Boeing 787-8 Dreamliner','Boeing','Wide-body',2,242,13621),
  ('B77W','77W','Boeing 777-300ER','Boeing','Wide-body',2,396,13649),
  ('B772','772','Boeing 777-200ER','Boeing','Wide-body',2,305,13080),
  ('B744','744','Boeing 747-400','Boeing','Wide-body',4,416,13450),
  ('B738','738','Boeing 737-800','Boeing','Narrow-body',2,189,5765),
  ('B38M','7M8','Boeing 737 MAX 8','Boeing','Narrow-body',2,210,6570),
  ('A359','359','Airbus A350-900','Airbus','Wide-body',2,440,15000),
  ('A35K','351','Airbus A350-1000','Airbus','Wide-body',2,369,16100),
  ('A388','388','Airbus A380-800','Airbus','Wide-body',4,853,15200),
  ('A321','321','Airbus A321-200','Airbus','Narrow-body',2,220,5930),
  ('A21N','32Q','Airbus A321neo','Airbus','Narrow-body',2,244,7400),
  ('A320','320','Airbus A320-200','Airbus','Narrow-body',2,180,6150),
  ('A319','319','Airbus A319-100','Airbus','Narrow-body',2,156,6850),
  ('E190','E90','Embraer E190','Embraer','Regional',2,114,4537),
  ('AT75','AT7','ATR 72-500','ATR','Turboprop',2,74,1528),
  ('B763','763','Boeing 767-300ER','Boeing','Wide-body',2,269,11093),
  ('A124','A4F','Antonov An-124-100','Antonov','Cargo',4,0,5400),
  ('B748','74Y','Boeing 747-8F','Boeing','Cargo',4,0,8130),
  ('MD11','M11','McDonnell Douglas MD-11','Boeing','Wide-body',3,293,12455)
ON CONFLICT (icao_code) DO NOTHING;

-- Key airlines
INSERT INTO airlines (iata, icao, name, country_code, hub_iata, alliance, founded_year, status) VALUES
  ('AA','AAL','American Airlines',   'US','DFW','oneworld',  1926,'ACTIVE'),
  ('EK','UAE','Emirates',            'AE','DXB',NULL,        1985,'ACTIVE'),
  ('BA','BAW','British Airways',     'GB','LHR','oneworld',  1974,'ACTIVE'),
  ('LH','DLH','Lufthansa',           'DE','FRA','Star Alliance',1953,'ACTIVE'),
  ('AF','AFR','Air France',          'FR','CDG','SkyTeam',   1933,'ACTIVE'),
  ('SQ','SIA','Singapore Airlines',  'SG','SIN','Star Alliance',1972,'ACTIVE'),
  ('NH','ANA','All Nippon Airways',  'JP','NRT','Star Alliance',1952,'ACTIVE'),
  ('TK','THY','Turkish Airlines',    'TR','IST','Star Alliance',1933,'ACTIVE'),
  ('HY','UZB','Uzbekistan Airways',  'UZ','TAS',NULL,        1992,'ACTIVE'),
  ('SU','AFL','Aeroflot',            'RU','SVO','SkyTeam',   1923,'ACTIVE'),
  ('KC','KZR','Air Astana',          'KZ','ALA',NULL,        2001,'ACTIVE'),
  ('AI','AIC','Air India',           'IN','DEL','Star Alliance',1932,'ACTIVE'),
  ('VS','VIR','Virgin Atlantic',     'GB','LHR',NULL,        1984,'ACTIVE'),
  ('KL','KLM','KLM Royal Dutch Airlines','NL','AMS','SkyTeam',1919,'ACTIVE'),
  ('QF','QFA','Qantas',              'AU','SYD','oneworld',  1920,'ACTIVE'),
  ('CX','CPA','Cathay Pacific',      'HK','HKG','oneworld',  1946,'ACTIVE'),
  ('OZ','AAR','Asiana Airlines',     'KR','ICN','Star Alliance',1988,'ACTIVE')
ON CONFLICT (icao) DO NOTHING;

-- Key airports
INSERT INTO airports (iata, icao, name, city, country_code, lat, lng, timezone) VALUES
  ('DXB','OMDB','Dubai International',      'Dubai',         'AE', 25.2528,  55.3644,  'Asia/Dubai'),
  ('LHR','EGLL','London Heathrow',          'London',        'GB', 51.4775,  -0.4614,  'Europe/London'),
  ('CDG','LFPG','Paris Charles de Gaulle',  'Paris',         'FR', 49.0128,   2.5500,  'Europe/Paris'),
  ('FRA','EDDF','Frankfurt Airport',        'Frankfurt',     'DE', 50.0379,   8.5622,  'Europe/Berlin'),
  ('AMS','EHAM','Amsterdam Schiphol',       'Amsterdam',     'NL', 52.3086,   4.7639,  'Europe/Amsterdam'),
  ('SIN','WSSS','Singapore Changi',         'Singapore',     'SG',  1.3592, 103.9894,  'Asia/Singapore'),
  ('JFK','KJFK','John F. Kennedy Intl',     'New York',      'US', 40.6413,  -73.7781, 'America/New_York'),
  ('IST','LTFM','Istanbul Airport',         'Istanbul',      'TR', 41.2753,  28.7519,  'Europe/Istanbul'),
  ('TAS','UTTT','Tashkent International',   'Tashkent',      'UZ', 41.2579,  69.2814,  'Asia/Tashkent'),
  ('NRT','RJAA','Tokyo Narita',             'Tokyo',         'JP', 35.7720, 140.3929,  'Asia/Tokyo'),
  ('HKG','VHHH','Hong Kong International', 'Hong Kong',     'HK', 22.3080, 113.9185,  'Asia/Hong_Kong'),
  ('SYD','YSSY','Sydney Kingsford Smith',   'Sydney',        'AU',-33.9461, 151.1772,  'Australia/Sydney'),
  ('DFW','KDFW','Dallas/Fort Worth Intl',   'Dallas',        'US', 32.8998,  -97.0403, 'America/Chicago'),
  ('SVO','UUEE','Sheremetyevo Intl',        'Moscow',        'RU', 55.9726,  37.4146,  'Europe/Moscow'),
  ('ALA','UAAA','Almaty International',     'Almaty',        'KZ', 43.3521,  77.0405,  'Asia/Almaty'),
  ('GRU','SBGR','Guarulhos Intl',           'São Paulo',     'BR',-23.4356,  -46.4731, 'America/Sao_Paulo'),
  ('JNB','FAOR','O.R. Tambo International', 'Johannesburg',  'ZA',-26.1367,  28.2411,  'Africa/Johannesburg')
ON CONFLICT (iata) DO NOTHING;

-- Achievements seed
INSERT INTO achievements (slug, name, description, icon, color, points, condition) VALUES
  ('first_upload',  'First Flight',    'First approved photo',          'Plane',    '#00d4ff', 10,  '{"type":"upload_count","threshold":1}'   ),
  ('ten_uploads',   'Getting Started', '10 approved photos',            'Camera',   '#00e676', 25,  '{"type":"upload_count","threshold":10}'  ),
  ('hundred_club',  'Century Club',    '100 approved photos',           'Award',    '#ffa726', 100, '{"type":"upload_count","threshold":100}' ),
  ('thousand_club', '1K Club',         '1,000 approved photos',         'Star',     '#ffa726', 500, '{"type":"upload_count","threshold":1000}'),
  ('night_owl',     'Night Owl',       '25+ night photography shots',   'Moon',     '#7c4dff', 75,  '{"type":"category_count","category":"NIGHT","threshold":25}'),
  ('rare_catch',    'Rare Catch',      'First to photograph an aircraft','Sparkles', '#00d4ff', 200, '{"type":"first_photo"}'                  ),
  ('globe_trotter', 'Globe Trotter',   'Photos from 10+ countries',     'Globe2',   '#00e676', 150, '{"type":"country_count","threshold":10}' ),
  ('collector',     'Collector',       '50+ unique aircraft types',     'LayoutGrid','#8899aa',100, '{"type":"type_count","threshold":50}'    ),
  ('daily_streak',  'Daily Streak',    '30 consecutive active days',    'Zap',      '#00e676', 50,  '{"type":"streak","threshold":30}'        ),
  ('legend',        'Legend',          '5,000 approved photos',         'Crown',    '#ffa726', 1000,'{"type":"upload_count","threshold":5000}')
ON CONFLICT (slug) DO NOTHING;

-- Forum categories seed
INSERT INTO forum_categories (slug, name, description, icon, color, sort_order) VALUES
  ('news',      'Aviation News',      'Industry updates & announcements',  'Globe2',       '#00d4ff', 1),
  ('id',        'Aircraft ID Help',   'Identify mystery registrations',    'HelpCircle',   '#00e676', 2),
  ('spotting',  'Spotting Reports',   'Airport visits & trip reports',     'Camera',       '#ffa726', 3),
  ('tech',      'Tech & Equipment',   'Cameras, lenses, technique tips',   'Plane',        '#7c4dff', 4),
  ('rare',      'Rare Catches',       'Share your unusual sightings',      'Flame',        '#ef5350', 5),
  ('general',   'General Discussion', 'Everything else aviation',          'MessageSquare','#8899aa', 6)
ON CONFLICT (slug) DO NOTHING;

