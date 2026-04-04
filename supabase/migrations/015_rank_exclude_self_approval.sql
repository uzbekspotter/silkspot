-- Rank ladder uses approved_uploads; do not count photos the uploader approved themselves
-- (moderated_by = uploader_id). Legacy rows with moderated_by NULL still count.

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
    UPDATE aircraft SET photo_count = photo_count + 1 WHERE id = NEW.aircraft_id;
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
    UPDATE aircraft
    SET photo_count = GREATEST(photo_count - 1, 0)
    WHERE id = OLD.aircraft_id;
    IF OLD.airport_id IS NOT NULL THEN
      UPDATE airports
      SET photo_count = GREATEST(photo_count - 1, 0)
      WHERE id = OLD.airport_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Reconcile counters from photos (fixes inflated ranks from past self-approvals).
WITH rank_eligible AS (
  SELECT uploader_id, COUNT(*)::int AS c
  FROM photos
  WHERE status = 'APPROVED'
    AND (moderated_by IS NULL OR uploader_id IS DISTINCT FROM moderated_by)
  GROUP BY uploader_id
),
all_approved AS (
  SELECT uploader_id, COUNT(*)::int AS c
  FROM photos
  WHERE status = 'APPROVED'
  GROUP BY uploader_id
)
UPDATE user_profiles up
SET
  approved_uploads = COALESCE(re.c, 0),
  total_uploads    = COALESCE(aa.c, 0)
FROM user_profiles base
LEFT JOIN rank_eligible re ON re.uploader_id = base.id
LEFT JOIN all_approved aa ON aa.uploader_id = base.id
WHERE up.id = base.id;

-- Refresh auto ranks (mirror public.update_user_rank thresholds).
UPDATE user_profiles
SET rank = CASE
  WHEN COALESCE(rank_manual, false) THEN rank
  WHEN approved_uploads >= 5000 THEN 'Legend'
  WHEN approved_uploads >= 2500 THEN 'Master'
  WHEN approved_uploads >= 1000 THEN 'Expert'
  WHEN approved_uploads >= 500  THEN 'Senior'
  WHEN approved_uploads >= 200  THEN 'Spotter'
  WHEN approved_uploads >= 50   THEN 'Contributor'
  WHEN approved_uploads >= 10   THEN 'Reporter'
  ELSE 'Observer'
END;
