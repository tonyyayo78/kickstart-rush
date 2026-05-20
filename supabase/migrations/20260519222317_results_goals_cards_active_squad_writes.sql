-- ============================================================
-- results_goals_cards_active_squad_writes
--
-- Closes Brief 42: Charlene Kellman (Team Manager, has squad
-- assignments, NOT an approver) cannot enter results for non-
-- Kickstart vs non-Kickstart fixtures. RLS rejects with
-- "Failed to save result. Try again." because the existing
-- 2026-05-17 policy only allows writes when one of the fixture's
-- teams belongs to a squad in the user's user_accessible_squads()
-- OR when the user is an approver. Non-Kickstart matches have no
-- Kickstart squad, and Charlene is not an approver.
--
-- Owner-confirmed design intent: any active user with at least
-- one squad assignment should be able to write match data, not
-- just approvers. This is needed for league-table accuracy:
-- standings calculations rely on every result being recorded,
-- including non-Kickstart matches, and only Team-Manager-style
-- users will be entering those.
--
-- Fix: replace the USING and WITH CHECK clauses on
-- results_active_squad / goals_active_squad / cards_active_squad
-- with a simpler rule: any active authenticated user with at
-- least one row in user_accessible_squads() can write any
-- fixture's match data. The approver bypass is preserved as a
-- fallback for users who may have no squad assignment yet but
-- are approvers.
--
-- Tables NOT touched (intentional):
--   - match_fees: still Kickstart-only by design
--   - lineups / lineup_players: own-squad-only by design
--   - players: still scoped to user's squads
--   - fixtures: already broader-scoped by competition_id
--
-- Past-outage tripwires NOT touched (per project rules):
--   - user_accessible_squads(): function unchanged
--   - profiles_select USING clause: unchanged
-- ============================================================

BEGIN;

-- ── results ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS results_active_squad ON public.results;

CREATE POLICY results_active_squad
  ON public.results FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
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
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
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
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  );

COMMIT;
