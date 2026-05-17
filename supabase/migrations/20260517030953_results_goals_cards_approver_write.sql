-- ============================================================
-- results_goals_cards_approver_write
--
-- Closes Brief 20 bug: an approver attempting to enter a result
-- for a non-Kickstart vs non-Kickstart fixture received "Failed
-- to save result. Try again." because the existing RLS on
-- results/goals/cards rejects writes where neither competing
-- team belongs to a squad in user_accessible_squads().
--
-- Fix: add an approver bypass clause to USING and WITH CHECK on
-- all three policies. Approvers can write results/goals/cards
-- for any fixture; non-approver coaches remain scoped to their
-- own squads' results.
--
-- Tables NOT touched (intentional):
--   - match_fees: fees are Kickstart-only by design
--   - lineups / lineup_players: lineups are for your own team
--   - fixtures: already broader-scoped by competition_id
-- ============================================================

BEGIN;

-- ── results ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS results_active_squad ON public.results;

CREATE POLICY results_active_squad
  ON public.results FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.fixtures f
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  f.id = fixture_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.fixtures f
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  f.id = fixture_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  );

-- ── goals ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS goals_active_squad ON public.goals;

CREATE POLICY goals_active_squad
  ON public.goals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.results r
      JOIN   public.fixtures f  ON f.id  = r.fixture_id
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  r.id = result_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.results r
      JOIN   public.fixtures f  ON f.id  = r.fixture_id
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  r.id = result_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  );

-- ── cards ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS cards_active_squad ON public.cards;

CREATE POLICY cards_active_squad
  ON public.cards FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.fixtures f
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  f.id = cards.fixture_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.fixtures f
      JOIN   public.competition_teams ht ON ht.id = f.home_team_id
      JOIN   public.competition_teams at ON at.id = f.away_team_id
      WHERE  f.id = cards.fixture_id
        AND  (
          ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
          OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  );

COMMIT;
