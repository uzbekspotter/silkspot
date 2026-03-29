-- ============================================================
-- SkyGrid Pro — Database Schema
-- Migration 001: Core Tables
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- accent-insensitive search

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE aircraft_status   AS ENUM ('ACTIVE', 'STORED', 'SCRAPPED', 'WFU', 'PRESERVED');
CREATE TYPE photo_status      AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE photo_category    AS ENUM ('TAKEOFF','LANDING','STATIC','COCKPIT','AIR_TO_AIR','NIGHT','SPECIAL_LIVERY','SCRAPPED_SHOT','OTHER');
CREATE TYPE airline_status    AS ENUM ('ACTIVE', 'DEFUNCT', 'MERGED', 'SUSPENDED');
CREATE TYPE user_role         AS ENUM ('SPOTTER', 'EXPERT', 'MODERATOR', 'ADMIN');

-- ============================================================
-- REFERENCE TABLES
-- ============================================================

-- Countries (ISO 3166-1)
CREATE TABLE countries (
  code        CHAR(2)       PRIMARY KEY,
  name        VARCHAR(80)   NOT NULL,
  flag_emoji  VARCHAR(8)
);

-- Aircraft types / models
CREATE TABLE aircraft_types (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  icao_code       VARCHAR(4)    NOT NULL UNIQUE,  -- e.g. 'B789'
  iata_code       VARCHAR(3),                     -- e.g. '789'
  name            VARCHAR(100)  NOT NULL,          -- e.g. 'Boeing 787-9 Dreamliner'
  manufacturer    VARCHAR(50)   NOT NULL,          -- e.g. 'Boeing'
  category        VARCHAR(30),                     -- 'Narrow-body','Wide-body','Regional','Turboprop'
  engine_count    SMALLINT,
  max_pax         SMALLINT,
  range_km        INTEGER,
  created_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_aircraft_types_icao ON aircraft_types(icao_code);
CREATE INDEX idx_aircraft_types_manufacturer ON aircraft_types(manufacturer);

-- Airlines / Operators
CREATE TABLE airlines (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  iata            CHAR(2),
  icao            CHAR(3)       UNIQUE,
  name            VARCHAR(100)  NOT NULL,
  country_code    CHAR(2)       REFERENCES countries(code),
  logo_url        TEXT,
  hub_iata        CHAR(3),
  alliance        VARCHAR(30),
  fleet_size      INTEGER       DEFAULT 0,
  founded_year    SMALLINT,
  status          airline_status DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_airlines_iata ON airlines(iata);
CREATE INDEX idx_airlines_icao ON airlines(icao);
CREATE INDEX idx_airlines_name_trgm ON airlines USING GIN (name gin_trgm_ops);

-- Airports
CREATE TABLE airports (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  iata            CHAR(3)       UNIQUE,
  icao            CHAR(4)       UNIQUE,
  name            VARCHAR(100)  NOT NULL,
  city            VARCHAR(80),
  country_code    CHAR(2)       REFERENCES countries(code),
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  elevation_ft    INTEGER,
  timezone        VARCHAR(50),
  photo_count     INTEGER       DEFAULT 0,
  spotter_count   INTEGER       DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_airports_iata ON airports(iata);
CREATE INDEX idx_airports_icao ON airports(icao);
CREATE INDEX idx_airports_name_trgm ON airports USING GIN (name gin_trgm_ops);
CREATE INDEX idx_airports_coords ON airports(lat, lng);

-- ============================================================
-- CORE: AIRCRAFT
-- ============================================================
CREATE TABLE aircraft (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration    VARCHAR(12)   NOT NULL UNIQUE,
  type_id         UUID          REFERENCES aircraft_types(id),
  msn             VARCHAR(20),
  line_number     VARCHAR(10),
  icao_hex        VARCHAR(6),
  selcal          VARCHAR(9),
  year_built      SMALLINT,
  first_flight    DATE,
  status          aircraft_status DEFAULT 'ACTIVE',
  is_verified     BOOLEAN       DEFAULT false,
  photo_count     INTEGER       DEFAULT 0,
  view_count      BIGINT        DEFAULT 0,
  like_count      INTEGER       DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now(),
  created_by      UUID          REFERENCES auth.users(id)
);

CREATE INDEX idx_aircraft_registration ON aircraft(registration);
CREATE INDEX idx_aircraft_msn ON aircraft(msn);
CREATE INDEX idx_aircraft_icao_hex ON aircraft(icao_hex);
CREATE INDEX idx_aircraft_status ON aircraft(status);
CREATE INDEX idx_aircraft_type ON aircraft(type_id);
CREATE INDEX idx_aircraft_reg_trgm ON aircraft USING GIN (registration gin_trgm_ops);

-- Operator history (which airline flew which aircraft when)
CREATE TABLE aircraft_operators (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  aircraft_id           UUID          NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  airline_id            UUID          REFERENCES airlines(id),
  registration_at_time  VARCHAR(12),  -- reg may differ from current
  start_date            DATE,
  end_date              DATE,         -- NULL = current operator
  livery                VARCHAR(100),
  notes                 TEXT,
  is_current            BOOLEAN       GENERATED ALWAYS AS (end_date IS NULL) STORED,
  created_at            TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_aircraft_operators_aircraft ON aircraft_operators(aircraft_id);
CREATE INDEX idx_aircraft_operators_airline ON aircraft_operators(airline_id);
CREATE INDEX idx_aircraft_operators_current ON aircraft_operators(aircraft_id) WHERE end_date IS NULL;

-- ============================================================
-- USERS / PROFILES
-- ============================================================
CREATE TABLE user_profiles (
  id                  UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            VARCHAR(30)   NOT NULL UNIQUE,
  display_name        VARCHAR(60),
  avatar_url          TEXT,
  cover_url           TEXT,
  bio                 TEXT,
  location            VARCHAR(100),
  country_code        CHAR(2)       REFERENCES countries(code),
  home_airport_id     UUID          REFERENCES airports(id),
  role                user_role     DEFAULT 'SPOTTER',
  rank                VARCHAR(30)   DEFAULT 'Observer',
  total_uploads       INTEGER       DEFAULT 0,
  approved_uploads    INTEGER       DEFAULT 0,
  total_views         BIGINT        DEFAULT 0,
  total_likes         INTEGER       DEFAULT 0,
  airports_visited    INTEGER       DEFAULT 0,
  aircraft_types_shot INTEGER       DEFAULT 0,
  countries_visited   INTEGER       DEFAULT 0,
  follower_count      INTEGER       DEFAULT 0,
  following_count     INTEGER       DEFAULT 0,
  joined_at           TIMESTAMPTZ   DEFAULT now(),
  last_active         TIMESTAMPTZ   DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_rank ON user_profiles(rank);
CREATE INDEX idx_user_profiles_uploads ON user_profiles(approved_uploads DESC);

-- Follows
CREATE TABLE user_follows (
  follower_id   UUID  NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id  UUID  NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE photos (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  aircraft_id     UUID            NOT NULL REFERENCES aircraft(id),
  uploader_id     UUID            NOT NULL REFERENCES user_profiles(id),
  operator_id     UUID            REFERENCES airlines(id),
  airport_id      UUID            REFERENCES airports(id),

  -- Shot metadata
  shot_date       DATE            NOT NULL,
  shot_lat        DECIMAL(9,6),
  shot_lng        DECIMAL(9,6),
  category        photo_category  DEFAULT 'OTHER',
  livery_notes    VARCHAR(100),
  notes           TEXT,

  -- Files (Cloudflare R2 / Supabase Storage keys)
  storage_path    TEXT            NOT NULL,   -- original
  webp_path       TEXT,                       -- 1920px WebP
  thumb_path      TEXT,                       -- 400px thumb

  -- EXIF extracted
  camera_make     VARCHAR(50),
  camera_model    VARCHAR(80),
  lens            VARCHAR(80),
  focal_length    SMALLINT,
  aperture        DECIMAL(4,1),
  shutter_speed   VARCHAR(20),
  iso             SMALLINT,
  width_px        INTEGER,
  height_px       INTEGER,
  file_size_kb    INTEGER,

  -- Moderation
  status          photo_status    DEFAULT 'PENDING',
  rejection_reason TEXT,
  moderated_by    UUID            REFERENCES user_profiles(id),
  moderated_at    TIMESTAMPTZ,

  -- Stats
  like_count      INTEGER         DEFAULT 0,
  view_count      INTEGER         DEFAULT 0,
  is_featured     BOOLEAN         DEFAULT false,
  metadata_score  SMALLINT        DEFAULT 0,  -- 0-100 completeness score

  created_at      TIMESTAMPTZ     DEFAULT now(),
  updated_at      TIMESTAMPTZ     DEFAULT now()
);

CREATE INDEX idx_photos_aircraft ON photos(aircraft_id);
CREATE INDEX idx_photos_uploader ON photos(uploader_id);
CREATE INDEX idx_photos_airport ON photos(airport_id);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_featured ON photos(is_featured) WHERE is_featured = true;
CREATE INDEX idx_photos_shot_date ON photos(shot_date DESC);
CREATE INDEX idx_photos_created ON photos(created_at DESC);
CREATE INDEX idx_photos_approved ON photos(created_at DESC) WHERE status = 'APPROVED';
CREATE INDEX idx_photos_coords ON photos(shot_lat, shot_lng) WHERE shot_lat IS NOT NULL;

-- Photo likes (prevent duplicate)
CREATE TABLE photo_likes (
  user_id     UUID  NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  photo_id    UUID  NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, photo_id)
);

-- Photo comments (threaded)
CREATE TABLE photo_comments (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id    UUID    NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  author_id   UUID    NOT NULL REFERENCES user_profiles(id),
  parent_id   UUID    REFERENCES photo_comments(id),
  body        TEXT    NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  like_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_photo ON photo_comments(photo_id, created_at);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE achievements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(60) NOT NULL,
  description TEXT,
  icon        VARCHAR(30),
  color       VARCHAR(20),
  points      INTEGER     DEFAULT 0,
  condition   JSONB       -- e.g. {"type":"upload_count","threshold":1000}
);

CREATE TABLE user_achievements (
  user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id  UUID        NOT NULL REFERENCES achievements(id),
  earned_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,  -- 'like','comment','follow','approved','rejected'
  actor_id    UUID        REFERENCES user_profiles(id),
  photo_id    UUID        REFERENCES photos(id),
  message     TEXT,
  is_read     BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- MODERATION LOG
-- ============================================================
CREATE TABLE moderation_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id    UUID        NOT NULL REFERENCES photos(id),
  moderator_id UUID       NOT NULL REFERENCES user_profiles(id),
  action      VARCHAR(20) NOT NULL,  -- 'approved','rejected','featured','unfeatured'
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FORUM
-- ============================================================
CREATE TABLE forum_categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(30) NOT NULL UNIQUE,
  name        VARCHAR(60) NOT NULL,
  description TEXT,
  icon        VARCHAR(30),
  color       VARCHAR(20),
  sort_order  SMALLINT    DEFAULT 0,
  thread_count INTEGER    DEFAULT 0,
  post_count   INTEGER    DEFAULT 0
);

CREATE TABLE forum_threads (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID        NOT NULL REFERENCES forum_categories(id),
  author_id       UUID        NOT NULL REFERENCES user_profiles(id),
  title           VARCHAR(200) NOT NULL,
  body            TEXT        NOT NULL,
  is_pinned       BOOLEAN     DEFAULT false,
  is_locked       BOOLEAN     DEFAULT false,
  reply_count     INTEGER     DEFAULT 0,
  view_count      INTEGER     DEFAULT 0,
  like_count      INTEGER     DEFAULT 0,
  last_reply_at   TIMESTAMPTZ,
  last_reply_by   UUID        REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_threads_category ON forum_threads(category_id, created_at DESC);
CREATE INDEX idx_threads_pinned ON forum_threads(category_id) WHERE is_pinned = true;
CREATE INDEX idx_threads_title_trgm ON forum_threads USING GIN (title gin_trgm_ops);

CREATE TABLE forum_posts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID        NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES user_profiles(id),
  body        TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  like_count  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_thread ON forum_posts(thread_id, created_at);

-- ============================================================
-- AIRPORT SPOTTING LOCATIONS
-- ============================================================
CREATE TABLE spotting_locations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id      UUID        NOT NULL REFERENCES airports(id),
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  best_runways    VARCHAR(50),
  best_times      VARCHAR(100),
  access_notes    TEXT,
  photo_count     INTEGER     DEFAULT 0,
  rating          DECIMAL(3,2),
  created_by      UUID        REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

