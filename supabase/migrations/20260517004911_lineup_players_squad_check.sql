-- ============================================================
-- lineup_players_squad_check
-- Closes audit finding 2026-05-15 #5: lineup_players RLS did not
-- verify the inserted player's squad matched the user's accessible
-- squads. A coach with access to Squad A could insert a Squad B
-- player into a Squad A lineup if they obtained a Squad B player UUID.
--
-- Minimal fix: the player's squad must also be in the user's
-- accessible squads. (Stricter version — requiring the player's
-- squad to match the fixture's competing teams — is deferred.)
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS lineup_players_active_squad ON public.lineup_players;

CREATE POLICY lineup_players_active_squad
  ON public.lineup_players FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.lineups l
      JOIN   public.fixtures f  ON f.id  = l.fixture_id
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  l.id = lineup_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    AND EXISTS (
      SELECT 1
      FROM   public.players p
      WHERE  p.id = player_id
        AND  p.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.lineups l
      JOIN   public.fixtures f  ON f.id  = l.fixture_id
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  l.id = lineup_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    AND EXISTS (
      SELECT 1
      FROM   public.players p
      WHERE  p.id = player_id
        AND  p.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
    )
  );

COMMIT;
