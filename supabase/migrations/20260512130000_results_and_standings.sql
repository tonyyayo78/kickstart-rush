-- ============================================================
-- results_and_standings
-- Adds results + goals tables, validation + sync triggers, and
-- replaces the Brief 8 placeholder view bodies.
-- ============================================================

-- ------------------------------------------------------------
-- results
-- ------------------------------------------------------------
CREATE TABLE public.results (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id   uuid        UNIQUE NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  home_score   int         NOT NULL CHECK (home_score >= 0),
  away_score   int         NOT NULL CHECK (away_score >= 0),
  match_notes  text,
  entered_by   uuid        REFERENCES public.profiles(id),
  entered_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY results_owner_all ON public.results FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE TRIGGER results_set_updated_at BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER results_audit AFTER INSERT OR UPDATE OR DELETE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ------------------------------------------------------------
-- goals
-- ------------------------------------------------------------
CREATE TABLE public.goals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id           uuid        NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  competition_team_id uuid        NOT NULL REFERENCES public.competition_teams(id),
  player_id           uuid        REFERENCES public.players(id) ON DELETE SET NULL,
  minute              int         CHECK (minute >= 1 AND minute <= 130),
  is_own_goal         boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX goals_result_id_idx ON public.goals (result_id);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_owner_all ON public.goals FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE TRIGGER goals_audit AFTER INSERT OR UPDATE OR DELETE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ------------------------------------------------------------
-- goals_validate_team
-- Ensures each goal's competition_team_id is one of the two
-- teams in the fixture, not an arbitrary team in the system.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.goals_validate_team()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_home uuid;
  v_away uuid;
BEGIN
  SELECT f.home_team_id, f.away_team_id
    INTO v_home, v_away
    FROM public.fixtures f
    JOIN public.results r ON r.fixture_id = f.id
   WHERE r.id = NEW.result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'result % not found', NEW.result_id;
  END IF;

  IF NEW.competition_team_id <> v_home AND NEW.competition_team_id <> v_away THEN
    RAISE EXCEPTION
      'goal team % is not a participant in this fixture (home=%, away=%)',
      NEW.competition_team_id, v_home, v_away;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER goals_validate_team
  BEFORE INSERT OR UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.goals_validate_team();

-- ------------------------------------------------------------
-- results_sync_fixture_status
-- Keeps fixtures.status in sync with result existence.
-- INSERT → 'played'. DELETE → 'scheduled'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.results_sync_fixture_status()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.fixtures SET status = 'played'    WHERE id = NEW.fixture_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.fixtures SET status = 'scheduled' WHERE id = OLD.fixture_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER results_sync_fixture_status
  AFTER INSERT OR DELETE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.results_sync_fixture_status();

-- ------------------------------------------------------------
-- Replace placeholder public_results_with_scorers
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.public_results_with_scorers;

CREATE VIEW public.public_results_with_scorers
  WITH (security_invoker = false)
AS
SELECT
  c.code        AS competition_code,
  f.kickoff_at,
  ht.team_name  AS home_team_name,
  at.team_name  AS away_team_name,
  r.home_score,
  r.away_score,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'team_name',           gt.team_name,
          'player_display_name',
            CASE
              WHEN g.is_own_goal              THEN p.display_name || ' (OG)'
              WHEN p.display_name IS NOT NULL THEN p.display_name
              ELSE NULL
            END,
          'minute',      g.minute,
          'is_own_goal', g.is_own_goal
        )
        ORDER BY g.minute NULLS LAST, g.id
      )
      FROM public.goals g
      LEFT JOIN public.players p  ON p.id  = g.player_id
      JOIN  public.competition_teams gt ON gt.id = g.competition_team_id
      WHERE g.result_id = r.id
    ),
    '[]'::jsonb
  ) AS scorers
FROM public.results r
JOIN public.fixtures          f  ON f.id  = r.fixture_id
JOIN public.competitions      c  ON c.id  = f.competition_id
JOIN public.competition_teams ht ON ht.id = f.home_team_id
JOIN public.competition_teams at ON at.id = f.away_team_id
WHERE c.is_public = true
ORDER BY f.kickoff_at DESC;

GRANT SELECT ON public.public_results_with_scorers TO anon;

-- ------------------------------------------------------------
-- Replace placeholder public_standings
-- LEFT JOINs preserve teams with zero results (all-zero row).
-- Points use competitions.points_for_win / points_for_draw.
-- Head-to-head tie-breaker deferred to Phase 2.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.public_standings;

CREATE VIEW public.public_standings
  WITH (security_invoker = false)
AS
SELECT
  c.code                 AS competition_code,
  c.name                 AS competition_name,
  ct.team_name,
  ct.is_kickstart,
  COUNT(r.id)::integer   AS played,
  COUNT(r.id) FILTER (
    WHERE (f.home_team_id = ct.id AND r.home_score > r.away_score)
       OR (f.away_team_id = ct.id AND r.away_score > r.home_score)
  )::integer             AS won,
  COUNT(r.id) FILTER (
    WHERE r.home_score = r.away_score
  )::integer             AS drawn,
  COUNT(r.id) FILTER (
    WHERE (f.home_team_id = ct.id AND r.home_score < r.away_score)
       OR (f.away_team_id = ct.id AND r.away_score < r.home_score)
  )::integer             AS lost,
  COALESCE(SUM(
    CASE WHEN f.home_team_id = ct.id THEN r.home_score ELSE r.away_score END
  ), 0)::integer         AS goals_for,
  COALESCE(SUM(
    CASE WHEN f.home_team_id = ct.id THEN r.away_score ELSE r.home_score END
  ), 0)::integer         AS goals_against,
  (COALESCE(SUM(
    CASE WHEN f.home_team_id = ct.id THEN r.home_score ELSE r.away_score END
  ), 0) - COALESCE(SUM(
    CASE WHEN f.home_team_id = ct.id THEN r.away_score ELSE r.home_score END
  ), 0))::integer        AS goal_difference,
  (
    COUNT(r.id) FILTER (
      WHERE (f.home_team_id = ct.id AND r.home_score > r.away_score)
         OR (f.away_team_id = ct.id AND r.away_score > r.home_score)
    ) * c.points_for_win
    + COUNT(r.id) FILTER (
      WHERE r.home_score = r.away_score
    ) * c.points_for_draw
  )::integer             AS points
FROM public.competition_teams ct
JOIN public.competitions c ON c.id = ct.competition_id
LEFT JOIN public.fixtures f ON
  f.competition_id = ct.competition_id
  AND (f.home_team_id = ct.id OR f.away_team_id = ct.id)
LEFT JOIN public.results r ON r.fixture_id = f.id
WHERE c.is_public = true
GROUP BY
  c.code, c.name, c.points_for_win, c.points_for_draw,
  ct.id, ct.team_name, ct.is_kickstart
ORDER BY points DESC, goal_difference DESC, goals_for DESC, ct.team_name ASC;

GRANT SELECT ON public.public_standings TO anon;
