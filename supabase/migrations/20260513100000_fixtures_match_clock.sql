-- ============================================================
-- fixtures_match_clock
-- Adds live-match clock state columns to fixtures.
-- All columns are nullable so existing fixtures are unaffected.
-- Existing fixtures_active_squad ALL policy covers new columns.
-- No RLS changes needed.
-- ============================================================

ALTER TABLE public.fixtures
  ADD COLUMN match_state TEXT
    CHECK (match_state IN (
      'not_started','h1','h1_stoppage','halftime',
      'h2','h2_stoppage','full_time'
    )),
  ADD COLUMN h1_started_at  TIMESTAMPTZ,
  ADD COLUMN h2_started_at  TIMESTAMPTZ,
  ADD COLUMN h1_stoppage_minutes SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN h2_stoppage_minutes SMALLINT NOT NULL DEFAULT 0;
