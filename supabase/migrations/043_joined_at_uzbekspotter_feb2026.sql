-- One-off: correct displayed "Joined" date for uzbekspotter (was 2026-03-30).
-- Safe if row missing or username differs (updates 0 rows). Edit WHERE if your username is different.
UPDATE public.user_profiles
SET joined_at = '2026-02-02T00:00:00+00'::timestamptz
WHERE lower(trim(username)) = 'uzbekspotter';
