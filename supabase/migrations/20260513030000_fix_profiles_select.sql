-- ============================================================
-- fix_profiles_select
-- Removes the self-referential EXISTS from profiles_select.
--
-- Root cause: profiles_select contained:
--   auth.uid() = id
--   OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_approver = true)
--
-- The EXISTS subquery reads `profiles`, which triggers `profiles_select`
-- again, creating a nested RLS evaluation. Direct reads from profiles
-- (e.g., dashboard layout) survive because the outer OR short-circuits
-- on auth.uid() = id before the recursive subquery fires. But any
-- indirect read — where another table's policy (squads_active_select,
-- competition_teams_active_select, user_accessible_squads join, etc.)
-- issues EXISTS (SELECT 1 FROM profiles ...) — enters profiles_select
-- at a deeper nesting level where PostgreSQL detects the cycle and raises:
--   ERROR 42P17: infinite recursion detected in policy for relation "profiles"
-- This caused every squads/fixtures/fees/players page to 404.
--
-- Fix: reduce profiles_select to a simple self-read rule.
-- For MVP there is only one user, so no approver needs to see other rows.
--
-- TODO (Brief 15 — Approval Queue): when the multi-user access approval
-- flow is built, approvers must be able to read all profiles. Do NOT
-- restore the recursive EXISTS. Instead use one of:
--   a) Store is_approver in JWT app_metadata; check via auth.jwt() claim.
--   b) SECURITY DEFINER helper that reads profiles bypassing RLS, but
--      verify auth.uid() still resolves correctly in that context first.
-- ============================================================

DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
