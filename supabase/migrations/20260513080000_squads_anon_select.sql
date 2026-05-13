-- ============================================================
-- squads_anon_select
-- Grants the anon role SELECT on squads so the public
-- request-access form can list teams without authentication.
--
-- Squad names and codes are already publicly visible through the
-- public_fixtures, public_results_with_scorers, and
-- public_standings views, so this does not expose anything new.
--
-- INSERT, UPDATE, and DELETE on squads remain restricted to
-- authenticated approvers — those policies are unchanged.
-- No other table's policies are modified.
-- ============================================================

CREATE POLICY squads_anon_select
  ON public.squads FOR SELECT TO anon
  USING (true);
