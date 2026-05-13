-- ============================================================
-- fixtures_competition_scope
-- Expands fixtures_active_squad so the owner sees all fixtures
-- in any competition where a Kickstart squad participates,
-- not just fixtures where Kickstart is the home or away team.
--
-- Old: fixture visible only when home_team or away_team belongs
--      to one of the user's squads (14 Kickstart fixtures).
--
-- New: fixture visible when *any* team in its competition belongs
--      to one of the user's squads (all 56 fixtures in the league
--      and cup competitions Kickstart enter).
--
-- The inner subquery finds accessible competition_ids by looking
-- for competition_teams whose squad_id is in user_accessible_squads().
-- The outer EXISTS then matches any fixture whose home or away team
-- sits in one of those competitions.
-- ============================================================

DROP POLICY IF EXISTS fixtures_active_squad ON public.fixtures;

CREATE POLICY fixtures_active_squad
  ON public.fixtures FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.competition_teams ct
      WHERE  (ct.id = home_team_id OR ct.id = away_team_id)
        AND  ct.competition_id IN (
               SELECT DISTINCT ct2.competition_id
               FROM   public.competition_teams ct2
               WHERE  ct2.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
             )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.competition_teams ct
      WHERE  (ct.id = home_team_id OR ct.id = away_team_id)
        AND  ct.competition_id IN (
               SELECT DISTINCT ct2.competition_id
               FROM   public.competition_teams ct2
               WHERE  ct2.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
             )
    )
  );
