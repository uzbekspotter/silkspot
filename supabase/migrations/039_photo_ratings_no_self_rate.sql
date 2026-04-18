-- Prevent photo owners from rating their own photos.
-- Replaces the existing insert policy with one that also checks ownership.

DROP POLICY IF EXISTS "photo_ratings_insert_own" ON public.photo_ratings;

CREATE POLICY "photo_ratings_insert_own"
  ON public.photo_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.photos
      WHERE id = photo_id AND uploader_id = auth.uid()
    )
  );

-- Also block updating ratings on own photos (edge case: photo ownership transferred).
DROP POLICY IF EXISTS "photo_ratings_update_own" ON public.photo_ratings;

CREATE POLICY "photo_ratings_update_own"
  ON public.photo_ratings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.photos
      WHERE id = photo_id AND uploader_id = auth.uid()
    )
  );
