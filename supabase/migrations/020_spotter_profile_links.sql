-- Public links on spotter profile (social + aviation sites). Edited in Settings.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS spotter_links jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.spotter_links IS
  'JSON array of {title, url, group} where group is social | aviation; max ~16 entries, validated in app.';
