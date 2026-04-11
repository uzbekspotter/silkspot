-- Aircraft detail UI treats SCREENER as staff for edits, but `is_moderator()` is only MODERATOR/ADMIN.
-- Without this policy, screeners see the form enabled while PostgREST updates are rejected by RLS.

CREATE POLICY "aircraft_update_screener" ON public.aircraft
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role::text = 'SCREENER'
    )
  );
