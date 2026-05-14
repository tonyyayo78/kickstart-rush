-- Replace cards_owner_all (checks profiles.role = 'owner', which is null for the
-- owner profile) with cards_active_squad, matching the pattern used on results,
-- goals, lineups, and lineup_players.
DROP POLICY IF EXISTS cards_owner_all ON public.cards;

CREATE POLICY cards_active_squad ON public.cards FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.fixtures f
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  f.id = cards.fixture_id
        AND (
          ht.squad_id IN (SELECT squad_id FROM user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM user_accessible_squads())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.fixtures f
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  f.id = cards.fixture_id
        AND (
          ht.squad_id IN (SELECT squad_id FROM user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM user_accessible_squads())
        )
    )
  );
