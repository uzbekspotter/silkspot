-- Airport scene photos (no aircraft): runway, terminal, tower, apron, etc.
-- Requires airport_id; aircraft_id may be NULL.

ALTER TYPE public.photo_category ADD VALUE 'AIRPORT_RUNWAY';
ALTER TYPE public.photo_category ADD VALUE 'AIRPORT_TERMINAL';
ALTER TYPE public.photo_category ADD VALUE 'AIRPORT_OVERVIEW';
ALTER TYPE public.photo_category ADD VALUE 'AIRPORT_TOWER';
ALTER TYPE public.photo_category ADD VALUE 'AIRPORT_APRON';
ALTER TYPE public.photo_category ADD VALUE 'AIRPORT_OTHER';

ALTER TABLE public.photos
  ALTER COLUMN aircraft_id DROP NOT NULL;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_aircraft_or_airport_chk
  CHECK (aircraft_id IS NOT NULL OR airport_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.handle_photo_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  becoming_approved boolean;
  leaving_approved boolean;
  rank_counts_new boolean;
  rank_counts_old boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    becoming_approved := NEW.status = 'APPROVED';
    leaving_approved := false;
  ELSIF TG_OP = 'UPDATE' THEN
    becoming_approved := NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED';
    leaving_approved := OLD.status = 'APPROVED' AND NEW.status IS DISTINCT FROM 'APPROVED';
  ELSE
    becoming_approved := false;
    leaving_approved := false;
  END IF;

  rank_counts_new := NEW.moderated_by IS NULL OR NEW.uploader_id IS DISTINCT FROM NEW.moderated_by;
  rank_counts_old := OLD.moderated_by IS NULL OR OLD.uploader_id IS DISTINCT FROM OLD.moderated_by;

  IF becoming_approved THEN
    IF rank_counts_new THEN
      UPDATE user_profiles
      SET approved_uploads = approved_uploads + 1,
          total_uploads    = total_uploads + 1
      WHERE id = NEW.uploader_id;
    ELSE
      UPDATE user_profiles
      SET total_uploads = total_uploads + 1
      WHERE id = NEW.uploader_id;
    END IF;
    IF NEW.aircraft_id IS NOT NULL THEN
      UPDATE aircraft SET photo_count = photo_count + 1 WHERE id = NEW.aircraft_id;
    END IF;
    IF NEW.airport_id IS NOT NULL THEN
      UPDATE airports SET photo_count = photo_count + 1 WHERE id = NEW.airport_id;
    END IF;
  ELSIF leaving_approved THEN
    IF rank_counts_old THEN
      UPDATE user_profiles
      SET approved_uploads = GREATEST(approved_uploads - 1, 0)
      WHERE id = OLD.uploader_id;
    END IF;
    UPDATE user_profiles
    SET total_uploads = GREATEST(total_uploads - 1, 0)
    WHERE id = OLD.uploader_id;
    IF OLD.aircraft_id IS NOT NULL THEN
      UPDATE aircraft
      SET photo_count = GREATEST(photo_count - 1, 0)
      WHERE id = OLD.aircraft_id;
    END IF;
    IF OLD.airport_id IS NOT NULL THEN
      UPDATE airports
      SET photo_count = GREATEST(photo_count - 1, 0)
      WHERE id = OLD.airport_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
