-- ============================================================
-- SILKSPOT — Migration 025
-- Harden manual rank lock so admin-set rank is stable
-- ============================================================

-- Ensure the flag exists and behaves predictably.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS rank_manual boolean;

ALTER TABLE public.user_profiles
  ALTER COLUMN rank_manual SET DEFAULT false;

UPDATE public.user_profiles
SET rank_manual = false
WHERE rank_manual IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN rank_manual SET NOT NULL;

-- Auto-rank must never override manually locked rank.
CREATE OR REPLACE FUNCTION public.update_user_rank()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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

-- Rebind trigger to ensure it points to the latest function body.
DROP TRIGGER IF EXISTS rank_update_trigger ON public.user_profiles;

CREATE TRIGGER rank_update_trigger
BEFORE UPDATE OF approved_uploads ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rank();
