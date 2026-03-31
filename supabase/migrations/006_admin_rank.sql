-- ============================================================
-- SILKSPOT — Migration 006
-- Admin-editable rank + preserve manual rank on upload count changes
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS rank_manual BOOLEAN DEFAULT false;

-- Skip auto rank when admin set rank manually
CREATE OR REPLACE FUNCTION public.update_user_rank()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(NEW.rank_manual, false) THEN
    RETURN NEW;
  END IF;
  NEW.rank := CASE
    WHEN NEW.approved_uploads >= 5000 THEN 'Legend'
    WHEN NEW.approved_uploads >= 2500 THEN 'Master'
    WHEN NEW.approved_uploads >= 1000 THEN 'Expert'
    WHEN NEW.approved_uploads >= 500  THEN 'Senior'
    WHEN NEW.approved_uploads >= 200  THEN 'Spotter'
    WHEN NEW.approved_uploads >= 50   THEN 'Contributor'
    WHEN NEW.approved_uploads >= 10   THEN 'Reporter'
    ELSE 'Observer'
  END;
  RETURN NEW;
END;
$$;

-- new_rank = '__AUTO__' → recalc from approved_uploads, clear manual flag
CREATE OR REPLACE FUNCTION admin_set_user_rank(target_id UUID, new_rank TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uploads INTEGER;
  computed TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF new_rank = '__AUTO__' THEN
    SELECT approved_uploads INTO uploads FROM user_profiles WHERE id = target_id;
    computed := CASE
      WHEN uploads >= 5000 THEN 'Legend'
      WHEN uploads >= 2500 THEN 'Master'
      WHEN uploads >= 1000 THEN 'Expert'
      WHEN uploads >= 500  THEN 'Senior'
      WHEN uploads >= 200  THEN 'Spotter'
      WHEN uploads >= 50   THEN 'Contributor'
      WHEN uploads >= 10   THEN 'Reporter'
      ELSE 'Observer'
    END;
    UPDATE user_profiles
    SET rank = computed, rank_manual = false
    WHERE id = target_id;
  ELSE
    UPDATE user_profiles
    SET rank = new_rank, rank_manual = true
    WHERE id = target_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_user_rank(UUID, TEXT) TO authenticated;
