-- Track when an admin has dismissed a Fast Track candidate notification via Telegram.
-- If true, subsequent spotter_links updates will not re-trigger the notification.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS fast_track_dismissed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.fast_track_dismissed IS
  'Set to true when an admin dismisses the Fast Track candidate Telegram notification. Prevents repeat notifications on future spotter_links updates.';
