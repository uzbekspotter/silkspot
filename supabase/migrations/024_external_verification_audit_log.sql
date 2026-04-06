-- Audit trail for manual external verification toggles.

CREATE TABLE IF NOT EXISTS public.external_verification_events (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  changed_by    uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  old_verified  boolean NOT NULL,
  new_verified  boolean NOT NULL,
  note          text NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_verif_events_user_created
  ON public.external_verification_events (user_id, created_at DESC);

ALTER TABLE public.external_verification_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'external_verification_events'
      AND policyname = 'ext_verif_events_select_admin'
  ) THEN
    CREATE POLICY ext_verif_events_select_admin
      ON public.external_verification_events
      FOR SELECT
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'external_verification_events'
      AND policyname = 'ext_verif_events_insert_admin'
  ) THEN
    CREATE POLICY ext_verif_events_insert_admin
      ON public.external_verification_events
      FOR INSERT
      WITH CHECK (public.is_admin() AND changed_by = auth.uid());
  END IF;
END$$;

COMMENT ON TABLE public.external_verification_events IS
  'Audit log of admin changes to user external verification fast-track status.';
