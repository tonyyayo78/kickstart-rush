-- ============================================================
-- fix_public_realtime_policies
--
-- Corrects the three anon SELECT policies introduced in
-- 20260517112234_public_realtime.sql. The original policies
-- relied on implicit RLS chaining through EXISTS subqueries;
-- this migration makes the Kickstart-competition restriction
-- explicit in each USING clause by calling
-- is_kickstart_competition() directly.
--
-- Security finding addressed: Critical (results_anon_select,
-- goals_anon_select) and High (cards_anon_select) from
-- security-reviewer R1 on brief-22-public-realtime.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS results_anon_select ON public.results;
CREATE POLICY results_anon_select
  ON public.results
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.fixtures f
      WHERE f.id = results.fixture_id
        AND is_kickstart_competition(f.competition_id)
    )
  );

DROP POLICY IF EXISTS goals_anon_select ON public.goals;
CREATE POLICY goals_anon_select
  ON public.goals
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.results r
      JOIN public.fixtures f ON f.id = r.fixture_id
      WHERE r.id = goals.result_id
        AND is_kickstart_competition(f.competition_id)
    )
  );

DROP POLICY IF EXISTS cards_anon_select ON public.cards;
CREATE POLICY cards_anon_select
  ON public.cards
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.fixtures f
      WHERE f.id = cards.fixture_id
        AND is_kickstart_competition(f.competition_id)
    )
  );

COMMIT;
