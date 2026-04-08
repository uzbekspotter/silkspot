-- ============================================================
-- SILKSPOT — Migration 026
-- Rank ladder update: Legend at 2500, remove Master tier
-- ============================================================

-- Update auto-rank thresholds.
CREATE OR REPLACE FUNCTION public.update_user_rank()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.rank_manual, false) THEN
    RETURN NEW;
  END IF;

  NEW.rank := CASE
    WHEN NEW.approved_uploads >= 2500 THEN 'Legend'
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

-- Keep trigger bound to the latest function body.
DROP TRIGGER IF EXISTS rank_update_trigger ON public.user_profiles;
CREATE TRIGGER rank_update_trigger
BEFORE UPDATE OF approved_uploads ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rank();

-- Remove deprecated rank label from existing profiles.
UPDATE public.user_profiles
SET rank = 'Legend'
WHERE rank = 'Master';

-- Align legend achievement threshold for existing projects.
UPDATE public.achievements
SET
  description = '2,500 approved photos',
  condition = jsonb_set(
    COALESCE(condition, '{}'::jsonb),
    '{threshold}',
    to_jsonb(2500),
    true
  )
WHERE slug = 'legend';
