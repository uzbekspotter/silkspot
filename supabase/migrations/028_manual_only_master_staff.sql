-- ============================================================
-- SILKSPOT — Migration 028
-- Master/Staff are manual-only ranks (admin assigned)
-- ============================================================

-- Any existing Master/Staff rows must be marked manual.
UPDATE public.user_profiles
SET rank_manual = true
WHERE rank IN ('Master', 'Staff')
  AND COALESCE(rank_manual, false) = false;

-- Guardrail: auto-mode users cannot have Master/Staff rank labels.
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_manual_rank_guard;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_manual_rank_guard
  CHECK (COALESCE(rank_manual, false) OR rank NOT IN ('Master', 'Staff'));
