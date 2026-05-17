-- ============================================================
-- public_realtime
--
-- Enables Supabase Realtime broadcast on the four match-data tables
-- (fixtures, results, goals, cards) for the anon role, with narrow
-- RLS scoping limiting broadcast to rows in competitions where a
-- Kickstart squad participates.
--
-- Architectural notes:
--   • Existing public_* views (security_invoker = false) continue
--     working unchanged. They bypass base-table RLS entirely; this
--     migration adds parallel anon SELECT paths used only by
--     Realtime delivery, not by the server-rendered views.
--   • Helper function is_kickstart_competition() is SECURITY DEFINER
--     because it must read competition_teams and squads (both
--     REVOKE'd from anon by 20260512120000). It does NOT reference
--     auth.uid() — past outage #2 only affects SECURITY DEFINER
--     functions that try to read auth.uid().
--   • Tables added to supabase_realtime publication broadcast row
--     changes to subscribed clients. RLS gates which rows each
--     subscriber receives.
--   • Fallback when Realtime is unavailable: Brief 21's
--     revalidatePublic() calls already invalidate the public route
--     caches on every mutation, so non-Realtime clients still see
--     fresh data on next navigation. Intentional defense-in-depth.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Helper function: is_kickstart_competition
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.is_kickstart_competition(uuid);

CREATE FUNCTION public.is_kickstart_competition(p_competition_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_teams ct
    WHERE ct.competition_id = p_competition_id
      AND ct.is_kickstart = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_kickstart_competition(uuid) TO anon;

-- ------------------------------------------------------------
-- 2. anon SELECT grants on the four broadcast tables
--    (parallel path to the existing public_* views; gated by
--     the RLS policies below)
-- ------------------------------------------------------------

GRANT SELECT ON public.fixtures TO anon;
GRANT SELECT ON public.results  TO anon;
GRANT SELECT ON public.goals    TO anon;
GRANT SELECT ON public.cards    TO anon;

-- ------------------------------------------------------------
-- 3. anon SELECT RLS policies
--    fixtures: direct call to helper using competition_id column
--    results/goals/cards: EXISTS chain through parent table
-- ------------------------------------------------------------

DROP POLICY IF EXISTS fixtures_anon_select ON public.fixtures;
CREATE POLICY fixtures_anon_select
  ON public.fixtures
  FOR SELECT
  TO anon
  USING (is_kickstart_competition(competition_id));

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

-- ------------------------------------------------------------
-- 4. Add tables to the supabase_realtime publication
--    The publication is created automatically by Supabase;
--    we only add tables to it.
-- ------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;

COMMIT;
