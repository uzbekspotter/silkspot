-- Auto-approve pending photos when a user gets fast-track (external_verified = true).
-- Covers all approval entry points (Admin UI, Telegram bot, direct DB updates).

CREATE OR REPLACE FUNCTION public.auto_approve_pending_photos_on_fast_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.external_verified, false) = false
     AND COALESCE(NEW.external_verified, false) = true THEN
    UPDATE public.photos
    SET
      status = 'APPROVED',
      moderated_by = NULL,
      moderated_at = COALESCE(moderated_at, now()),
      rejection_reason = NULL,
      updated_at = now()
    WHERE uploader_id = NEW.id
      AND status = 'PENDING';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_fast_track_auto_approve_trigger ON public.user_profiles;

CREATE TRIGGER user_fast_track_auto_approve_trigger
AFTER UPDATE OF external_verified ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_pending_photos_on_fast_track();

-- One-time backfill: users already marked external_verified should have no pending queue.
UPDATE public.photos p
SET
  status = 'APPROVED',
  moderated_by = NULL,
  moderated_at = COALESCE(p.moderated_at, now()),
  rejection_reason = NULL,
  updated_at = now()
FROM public.user_profiles u
WHERE p.uploader_id = u.id
  AND u.external_verified = true
  AND p.status = 'PENDING';
