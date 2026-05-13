-- ============================================================
-- goals_live_tracking
-- Adds half, stoppage_minutes, scoring_team to goals so the live
-- tracker can store full match-minute context per goal.
--
-- Existing goals (5 rows, all minute=NULL, manually entered):
--   - Backfilled to half=1, stoppage_minutes=0
--   - scoring_team left NULL (only live-tracked goals have it set)
--
-- scoring_team is nullable so old manual goals are unaffected.
-- The CHECK constraint only fires when scoring_team IS NOT NULL,
-- so it is safe against the existing rows.
--
-- Public view updated:
--   - Added f.status = 'played' guard so placeholder results rows
--     (created at kick-off with 0-0) don't appear publicly until
--     the match is confirmed.
--   - scorer objects now include half/minute/stoppage_minutes for
--     correct chronological ordering.
--   - ORDER BY updated to half, minute, stoppage_minutes, id.
-- ============================================================

-- ── New columns (nullable first so backfill can run) ─────────

ALTER TABLE public.goals
  ADD COLUMN half             SMALLINT,
  ADD COLUMN stoppage_minutes SMALLINT,
  ADD COLUMN scoring_team     TEXT
    CHECK (scoring_team IN ('kickstart', 'opposition'));

-- Kickstart goals must have a scorer; opposition goals must not.
ALTER TABLE public.goals
  ADD CONSTRAINT goals_scoring_team_player_check CHECK (
    scoring_team IS NULL
    OR (scoring_team = 'kickstart' AND player_id IS NOT NULL)
    OR (scoring_team = 'opposition' AND player_id IS NULL)
  );

-- ── Backfill existing rows ───────────────────────────────────

UPDATE public.goals
SET half             = 1,
    stoppage_minutes = 0
WHERE half IS NULL;

-- ── Apply NOT NULL now that all rows have values ─────────────

ALTER TABLE public.goals
  ALTER COLUMN half             SET NOT NULL,
  ALTER COLUMN half             SET DEFAULT 1,
  ALTER COLUMN stoppage_minutes SET NOT NULL,
  ALTER COLUMN stoppage_minutes SET DEFAULT 0;

-- ── Public view: add status guard + richer scorer ordering ───
-- Column allow-list (unchanged): competition_code, kickoff_at,
--   home_team_name, away_team_name, home_score, away_score, scorers
-- Change: scorers JSONB objects now include half, minute,
--   stoppage_minutes for correct ordering; f.status='played' guard.

CREATE OR REPLACE VIEW public.public_results_with_scorers AS
SELECT
  c.code          AS competition_code,
  f.kickoff_at,
  ht.team_name    AS home_team_name,
  at.team_name    AS away_team_name,
  r.home_score,
  r.away_score,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'team_name',          gt.team_name,
        'player_display_name',
          CASE
            WHEN g.is_own_goal              THEN p.display_name || ' (OG)'
            WHEN p.display_name IS NOT NULL THEN p.display_name
            ELSE NULL
          END,
        'minute',          g.minute,
        'half',            g.half,
        'stoppage_minutes', g.stoppage_minutes,
        'is_own_goal',     g.is_own_goal
      )
      ORDER BY g.half, g.minute NULLS LAST, g.stoppage_minutes, g.id
    )
    FROM   public.goals            g
    LEFT JOIN public.players       p  ON p.id  = g.player_id
    JOIN  public.competition_teams gt ON gt.id = g.competition_team_id
    WHERE  g.result_id = r.id
  ), '[]'::jsonb) AS scorers
FROM       public.results          r
JOIN       public.fixtures         f  ON f.id  = r.fixture_id
JOIN       public.competitions     c  ON c.id  = f.competition_id
JOIN       public.competition_teams ht ON ht.id = f.home_team_id
JOIN       public.competition_teams at ON at.id = f.away_team_id
WHERE      c.is_public   = true
  AND      f.status       = 'played'
ORDER BY   f.kickoff_at  DESC;
