-- ============================================================
-- user_model_phase_b
-- Policy swap: drops profiles_role enum and all role='owner'
-- policies, introduces user_accessible_squads() helper, and
-- replaces every policy with squad-scoped + status='active'
-- equivalents.
--
-- Runs in an explicit transaction. The owner profile MUST have
-- status='active' and at least one profile_teams row before
-- this migration is applied (guaranteed by phase_a seed).
-- ============================================================

BEGIN;

-- ── Safety check ──────────────────────────────────────────────────────────
-- Abort if the owner row isn't ready. Prevents locking out the app.

DO $$
DECLARE
  owner_squad_count int;
BEGIN
  SELECT COUNT(*)
    INTO owner_squad_count
    FROM public.profile_teams pt
    JOIN public.profiles p ON p.id = pt.profile_id
   WHERE p.email = 'alythcott@gmail.com'
     AND p.status = 'active';

  IF owner_squad_count = 0 THEN
    RAISE EXCEPTION
      'Safety check failed: owner has no active profile_teams rows. '
      'Ensure phase_a migration has been applied and owner seed is correct.';
  END IF;
END $$;

-- ── Drop all role='owner' policies ────────────────────────────────────────

DROP POLICY IF EXISTS profiles_self_select          ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update          ON public.profiles;
DROP POLICY IF EXISTS squads_owner_all              ON public.squads;
DROP POLICY IF EXISTS audit_log_owner_select        ON public.audit_log;
DROP POLICY IF EXISTS competitions_owner_all        ON public.competitions;
DROP POLICY IF EXISTS competition_teams_owner_all   ON public.competition_teams;
DROP POLICY IF EXISTS fixtures_owner_all            ON public.fixtures;
DROP POLICY IF EXISTS players_owner_all             ON public.players;
DROP POLICY IF EXISTS results_owner_all             ON public.results;
DROP POLICY IF EXISTS goals_owner_all               ON public.goals;
DROP POLICY IF EXISTS match_fees_owner_all          ON public.match_fees;
DROP POLICY IF EXISTS lineups_owner_all             ON public.lineups;
DROP POLICY IF EXISTS lineup_players_owner_all      ON public.lineup_players;
DROP POLICY IF EXISTS profile_teams_self_select     ON public.profile_teams;
DROP POLICY IF EXISTS profile_teams_owner_write     ON public.profile_teams;
DROP POLICY IF EXISTS access_requests_owner_all     ON public.access_requests;
DROP POLICY IF EXISTS access_request_teams_owner_all ON public.access_request_teams;

-- ── Drop role column + ENUM (no longer needed) ────────────────────────────

ALTER TABLE public.profiles DROP COLUMN IF EXISTS assigned_squad_id;
ALTER TABLE public.profiles DROP COLUMN role;
DROP TYPE  public.profiles_role;

-- ── Add new role text column ──────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN role text
  CHECK (role IN ('Coach', 'Manager', 'Technical Director'));

-- ── Helper function ───────────────────────────────────────────────────────
-- Returns the squad_ids accessible to the current authenticated user.
-- SECURITY DEFINER so it reads profile_teams without triggering RLS
-- recursion. STABLE so Postgres evaluates it once per query.

CREATE OR REPLACE FUNCTION public.user_accessible_squads()
  RETURNS TABLE(squad_id uuid)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT pt.squad_id
  FROM   public.profile_teams pt
  JOIN   public.profiles p ON p.id = pt.profile_id
  WHERE  pt.profile_id = auth.uid()
    AND  p.status = 'active'
$$;

-- ── profiles ──────────────────────────────────────────────────────────────

-- Each user sees their own row; approvers see all rows.
CREATE POLICY profiles_select
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approver = true
    )
  );

-- Each user may update only their own row.
CREATE POLICY profiles_self_update
  ON public.profiles FOR UPDATE TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── squads ────────────────────────────────────────────────────────────────

-- All active users may read squads (reference data).
CREATE POLICY squads_active_select
  ON public.squads FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
  );

-- Mutations remain approver-only (squads are global reference data).
CREATE POLICY squads_approver_write
  ON public.squads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE POLICY squads_approver_update
  ON public.squads FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE POLICY squads_approver_delete
  ON public.squads FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── audit_log ─────────────────────────────────────────────────────────────

CREATE POLICY audit_log_approver_select
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── competitions ──────────────────────────────────────────────────────────

CREATE POLICY competitions_active_select
  ON public.competitions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY competitions_approver_write
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE POLICY competitions_approver_update
  ON public.competitions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE POLICY competitions_approver_delete
  ON public.competitions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── competition_teams ─────────────────────────────────────────────────────

CREATE POLICY competition_teams_active_select
  ON public.competition_teams FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY competition_teams_approver_write
  ON public.competition_teams FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE POLICY competition_teams_approver_update
  ON public.competition_teams FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE POLICY competition_teams_approver_delete
  ON public.competition_teams FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── fixtures ──────────────────────────────────────────────────────────────
-- Visible when either team's squad_id is in the user's accessible squads.

CREATE POLICY fixtures_active_squad
  ON public.fixtures FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_teams ct
      WHERE (ct.id = home_team_id OR ct.id = away_team_id)
        AND ct.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competition_teams ct
      WHERE (ct.id = home_team_id OR ct.id = away_team_id)
        AND ct.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
    )
  );

-- ── players ───────────────────────────────────────────────────────────────

CREATE POLICY players_active_squad
  ON public.players FOR ALL TO authenticated
  USING (
    squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
  )
  WITH CHECK (
    squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
  );

-- ── results ───────────────────────────────────────────────────────────────

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
  );

-- ── goals ─────────────────────────────────────────────────────────────────

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
  );

-- ── match_fees ────────────────────────────────────────────────────────────

CREATE POLICY match_fees_active_squad
  ON public.match_fees FOR ALL TO authenticated
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
  );

-- ── lineups ───────────────────────────────────────────────────────────────

CREATE POLICY lineups_active_squad
  ON public.lineups FOR ALL TO authenticated
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
  );

-- ── lineup_players ────────────────────────────────────────────────────────

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
  );

-- ── profile_teams ─────────────────────────────────────────────────────────

-- Each user sees their own assignments; approvers see all.
CREATE POLICY profile_teams_select
  ON public.profile_teams FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true
    )
  );

-- Only approvers may modify squad assignments.
CREATE POLICY profile_teams_approver_write
  ON public.profile_teams FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── access_requests ───────────────────────────────────────────────────────

CREATE POLICY access_requests_approver_all
  ON public.access_requests FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── access_request_teams ──────────────────────────────────────────────────

CREATE POLICY access_request_teams_approver_all
  ON public.access_request_teams FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

-- ── update handle_new_user ────────────────────────────────────────────────
-- role='owner' column is gone; new users get status='active', is_approver=true
-- for the allow-listed email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  owner_email text;
BEGIN
  SELECT value INTO owner_email
  FROM public.app_config
  WHERE key = 'owner_email';

  IF owner_email IS NULL OR NEW.email IS DISTINCT FROM owner_email THEN
    RAISE EXCEPTION 'Email not authorised';
  END IF;

  INSERT INTO public.profiles (id, email, status, is_approver)
  VALUES (NEW.id, NEW.email, 'active', true);

  RETURN NEW;
END;
$$;

COMMIT;
