-- Allow automated/bot-originated verification events where no admin auth.users ID exists.
-- changed_by stays a FK when set; NULL means the action came from an automated source
-- (e.g., Telegram bot approve). The note column records who triggered it.

ALTER TABLE public.external_verification_events
  ALTER COLUMN changed_by DROP NOT NULL;
