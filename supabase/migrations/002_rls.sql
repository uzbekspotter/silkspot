-- ============================================================
-- SteppeSpot — Row Level Security Policies
-- Migration 002: RLS + Auth helpers
-- FIXED: moved helper functions to public schema
-- ============================================================

-- Enable RLS on all user-facing tables
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft             ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft_operators   ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log       ENABLE ROW LEVEL SECURITY;

-- ── Helper functions (public schema) ─────────────────────
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('MODERATOR','ADMIN')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
$$;

-- ── user_profiles ─────────────────────────────────────────
CREATE POLICY "profiles_select_public"  ON user_profiles FOR SELECT  USING (true);
CREATE POLICY "profiles_update_own"     ON user_profiles FOR UPDATE  USING (id = auth.uid());
CREATE POLICY "profiles_insert_own"     ON user_profiles FOR INSERT  WITH CHECK (id = auth.uid());

-- ── aircraft ──────────────────────────────────────────────
CREATE POLICY "aircraft_select_public"  ON aircraft FOR SELECT  USING (true);
CREATE POLICY "aircraft_insert_auth"    ON aircraft FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "aircraft_update_mod"     ON aircraft FOR UPDATE  USING (public.is_moderator());

-- ── aircraft_operators ────────────────────────────────────
CREATE POLICY "operators_select_public" ON aircraft_operators FOR SELECT USING (true);
CREATE POLICY "operators_insert_auth"   ON aircraft_operators FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "operators_update_mod"    ON aircraft_operators FOR UPDATE USING (public.is_moderator());

-- ── photos ────────────────────────────────────────────────
CREATE POLICY "photos_select_approved"  ON photos FOR SELECT
  USING (status = 'APPROVED' OR uploader_id = auth.uid() OR public.is_moderator());
CREATE POLICY "photos_insert_own"       ON photos FOR INSERT
  WITH CHECK (uploader_id = auth.uid());
CREATE POLICY "photos_update_own"       ON photos FOR UPDATE
  USING (
    (uploader_id = auth.uid() AND status = 'PENDING')
    OR public.is_moderator()
  );
CREATE POLICY "photos_delete_admin"     ON photos FOR DELETE USING (public.is_admin());

-- ── photo_likes ───────────────────────────────────────────
CREATE POLICY "likes_select_public"     ON photo_likes FOR SELECT  USING (true);
CREATE POLICY "likes_insert_own"        ON photo_likes FOR INSERT  WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_delete_own"        ON photo_likes FOR DELETE  USING (user_id = auth.uid());

-- ── photo_comments ────────────────────────────────────────
CREATE POLICY "comments_select_public"  ON photo_comments FOR SELECT  USING (true);
CREATE POLICY "comments_insert_auth"    ON photo_comments FOR INSERT  WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_update_own"     ON photo_comments FOR UPDATE  USING (author_id = auth.uid());
CREATE POLICY "comments_delete_own"     ON photo_comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_moderator());

-- ── user_follows ──────────────────────────────────────────
CREATE POLICY "follows_select_public"   ON user_follows FOR SELECT  USING (true);
CREATE POLICY "follows_insert_own"      ON user_follows FOR INSERT  WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_own"      ON user_follows FOR DELETE  USING (follower_id = auth.uid());

-- ── user_achievements ─────────────────────────────────────
CREATE POLICY "achievements_select_public" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert_own"    ON user_achievements FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── notifications ─────────────────────────────────────────
CREATE POLICY "notifs_select_own"       ON notifications FOR SELECT  USING (user_id = auth.uid());
CREATE POLICY "notifs_update_own"       ON notifications FOR UPDATE  USING (user_id = auth.uid());

-- ── forum ─────────────────────────────────────────────────
CREATE POLICY "threads_select_public"   ON forum_threads FOR SELECT  USING (true);
CREATE POLICY "threads_insert_auth"     ON forum_threads FOR INSERT  WITH CHECK (author_id = auth.uid());
CREATE POLICY "threads_update_own"      ON forum_threads FOR UPDATE
  USING (author_id = auth.uid() OR public.is_moderator());

CREATE POLICY "posts_select_public"     ON forum_posts FOR SELECT    USING (true);
CREATE POLICY "posts_insert_auth"       ON forum_posts FOR INSERT    WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_update_own"        ON forum_posts FOR UPDATE    USING (author_id = auth.uid());
CREATE POLICY "posts_delete_own"        ON forum_posts FOR DELETE
  USING (author_id = auth.uid() OR public.is_moderator());

-- ── moderation_log ────────────────────────────────────────
CREATE POLICY "modlog_select_mod"       ON moderation_log FOR SELECT  USING (public.is_moderator());
CREATE POLICY "modlog_insert_mod"       ON moderation_log FOR INSERT  WITH CHECK (public.is_moderator());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  meta_username  TEXT;
  base_username  TEXT;
  final_username TEXT;
  counter        INTEGER := 0;
BEGIN
  -- Prefer the username provided during registration, fall back to email prefix
  meta_username := NEW.raw_user_meta_data->>'username';

  IF meta_username IS NOT NULL AND length(meta_username) >= 3 AND meta_username ~ '^[a-zA-Z0-9_]+$' THEN
    base_username := lower(left(meta_username, 30));
  ELSE
    base_username := regexp_replace(
      lower(split_part(NEW.email, '@', 1)),
      '[^a-z0-9_]', '_', 'g'
    );
    base_username := left(base_username, 26);
    IF length(base_username) < 3 THEN
      base_username := base_username || '_usr';
    END IF;
  END IF;

  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', final_username)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RANK UPDATE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_rank()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
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

CREATE TRIGGER rank_update_trigger
  BEFORE UPDATE OF approved_uploads ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_rank();

-- ============================================================
-- PHOTO APPROVAL COUNTER TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_photo_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
    UPDATE user_profiles
    SET approved_uploads = approved_uploads + 1,
        total_uploads    = total_uploads + 1
    WHERE id = NEW.uploader_id;
    UPDATE aircraft SET photo_count = photo_count + 1 WHERE id = NEW.aircraft_id;
    IF NEW.airport_id IS NOT NULL THEN
      UPDATE airports SET photo_count = photo_count + 1 WHERE id = NEW.airport_id;
    END IF;
  ELSIF OLD.status = 'APPROVED' AND NEW.status <> 'APPROVED' THEN
    UPDATE user_profiles
    SET approved_uploads = GREATEST(approved_uploads - 1, 0)
    WHERE id = NEW.uploader_id;
    UPDATE aircraft
    SET photo_count = GREATEST(photo_count - 1, 0)
    WHERE id = NEW.aircraft_id;
    IF NEW.airport_id IS NOT NULL THEN
      UPDATE airports
      SET photo_count = GREATEST(photo_count - 1, 0)
      WHERE id = NEW.airport_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER photo_status_trigger
  BEFORE INSERT OR UPDATE OF status ON photos
  FOR EACH ROW EXECUTE FUNCTION public.handle_photo_status_change();
