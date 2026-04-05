-- Full account removal (database + auth.users). Only callers who pass is_admin() may run this.
-- Does not delete R2 objects; run storage cleanup separately if needed.

CREATE OR REPLACE FUNCTION public.admin_delete_user_account(p_target UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete user accounts';
  END IF;
  IF p_target IS NULL OR p_target = auth.uid() THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_target AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Cannot delete an administrator account';
  END IF;

  UPDATE public.photos SET moderated_by = NULL WHERE moderated_by = p_target;
  UPDATE public.forum_threads SET last_reply_by = NULL WHERE last_reply_by = p_target;

  DELETE FROM public.moderation_log
  WHERE photo_id IN (SELECT id FROM public.photos WHERE uploader_id = p_target)
     OR moderator_id = p_target;

  DELETE FROM public.photo_ratings WHERE user_id = p_target;

  DELETE FROM public.photo_comments WHERE photo_id IN (SELECT id FROM public.photos WHERE uploader_id = p_target);
  DELETE FROM public.photo_likes WHERE photo_id IN (SELECT id FROM public.photos WHERE uploader_id = p_target);
  DELETE FROM public.photo_daily_views WHERE photo_id IN (SELECT id FROM public.photos WHERE uploader_id = p_target);

  DELETE FROM public.photos WHERE uploader_id = p_target;

  DELETE FROM public.photo_comments WHERE author_id = p_target;
  DELETE FROM public.photo_likes WHERE user_id = p_target;

  DELETE FROM public.forum_posts WHERE author_id = p_target;
  DELETE FROM public.forum_threads WHERE author_id = p_target;

  UPDATE public.spotting_locations SET created_by = NULL WHERE created_by = p_target;
  UPDATE public.aircraft SET created_by = NULL, updated_by = NULL
  WHERE created_by = p_target OR updated_by = p_target;

  DELETE FROM public.user_follows WHERE follower_id = p_target OR following_id = p_target;
  DELETE FROM public.user_achievements WHERE user_id = p_target;
  DELETE FROM public.notifications WHERE user_id = p_target OR actor_id = p_target;

  DELETE FROM public.user_profiles WHERE id = p_target;

  DELETE FROM auth.users WHERE id = p_target;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_account(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID) TO authenticated;
