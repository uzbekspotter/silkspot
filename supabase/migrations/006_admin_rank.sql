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

-- Rank changes from the admin panel use UPDATE + RLS policy "profiles_update_admin"
-- (no RPC needed — avoids PostgREST "function not in schema cache" if migration not applied).
