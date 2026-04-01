-- Allow uploaders to enrich aircraft they created (type, MSN) so Fleet shows correct metadata.
DROP POLICY IF EXISTS "aircraft_update_mod" ON aircraft;

CREATE POLICY "aircraft_update_own" ON aircraft
  FOR UPDATE
  USING (created_by IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "aircraft_update_mod" ON aircraft
  FOR UPDATE
  USING (public.is_moderator());
