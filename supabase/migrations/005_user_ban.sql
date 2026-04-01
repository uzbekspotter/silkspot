-- ============================================================
-- SteppeSpot — Migration 005
-- Fix: admin management, user ban, home airport
-- ============================================================

-- 1. Add is_banned column
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 2. Add home_airport_iata column (simple text, no FK lookup needed)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS home_airport_iata VARCHAR(3);

-- 3. Allow admin to update ANY user profile (role, ban, etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_admin'
  ) THEN
    CREATE POLICY "profiles_update_admin"
      ON user_profiles FOR UPDATE
      USING (public.is_admin());
  END IF;
END $$;

-- 4. RPC: admin can update another user's role
CREATE OR REPLACE FUNCTION admin_set_user_role(target_id UUID, new_role TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE user_profiles SET role = new_role::user_role WHERE id = target_id;
END;
$$;

-- 5. RPC: admin can ban/unban a user
CREATE OR REPLACE FUNCTION admin_set_user_ban(target_id UUID, banned BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE user_profiles SET is_banned = banned WHERE id = target_id;
END;
$$;

-- 6. RPC: increment view count safely
CREATE OR REPLACE FUNCTION increment_view_count(photo_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE photos SET view_count = view_count + 1 WHERE id = photo_id;
END;
$$;
