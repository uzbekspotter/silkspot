-- ============================================================
-- SILKSPOT — Migration 013
-- Add SCREENER role to user_role enum
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'SCREENER'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'SCREENER';
  END IF;
END
$$;

-- Recreate RPC to keep deployment idempotent and aligned with role enum.
CREATE OR REPLACE FUNCTION admin_set_user_role(target_id UUID, new_role TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE user_profiles SET role = new_role::user_role WHERE id = target_id;
END;
$$;
