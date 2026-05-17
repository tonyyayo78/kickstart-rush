-- ============================================================
-- squads_coach_name
-- Adds an optional coach_name column to squads. Read by the
-- team-sheet page to populate the COACH field on printed team
-- sheets. Nullable — squads without a coach assigned render with
-- an empty coach line (still printable).
-- ============================================================

BEGIN;

ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS coach_name text;

COMMENT ON COLUMN public.squads.coach_name IS
  'Display name of the squad''s head coach, used on printable team sheets. Nullable.';

COMMIT;
