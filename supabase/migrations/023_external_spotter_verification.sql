-- Manual external-profile verification for fast-track uploads.
-- Admin confirms ownership of external profiles (JetPhotos / PlaneSpotters).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS external_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_verified_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS external_verification_note text NULL;

COMMENT ON COLUMN public.user_profiles.external_verified IS
  'Admin-approved external profile verification (JetPhotos / PlaneSpotters), enables fast-track uploads.';
COMMENT ON COLUMN public.user_profiles.external_verified_by IS
  'Admin user who granted external verification.';
COMMENT ON COLUMN public.user_profiles.external_verified_at IS
  'Timestamp when external verification was granted.';
COMMENT ON COLUMN public.user_profiles.external_verification_note IS
  'Optional admin note about external profile verification.';
