-- ============================================================
-- squads_anon_grant
-- Grants table-level SELECT privilege on squads to the anon role.
--
-- The RLS policy squads_anon_select (migration 20260513080000)
-- was in place but ineffective: Postgres checks table privileges
-- before evaluating RLS, so the anon role was hitting a 42501
-- permission-denied error before RLS could run.
--
-- INSERT, UPDATE, and DELETE privileges on squads are not granted.
-- No other table is affected.
-- ============================================================

GRANT SELECT ON public.squads TO anon;
