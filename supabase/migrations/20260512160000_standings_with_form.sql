-- Recreates public_standings adding a form text[] column:
-- last 5 played results per team, oldest-first (left-to-right = oldest → newest).
-- Empty array when no results exist yet.
--
-- Updated column allow-list:
--   competition_code   text
--   competition_name   text
--   team_name          text
--   is_kickstart       boolean
--   played             integer
--   won                integer
--   drawn              integer
--   lost               integer
--   goals_for          integer
--   goals_against      integer
--   goal_difference    integer
--   points             integer
--   form               text[]   ← new: e.g. ['W','L','D','W','W']

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
  )::integer             AS points,
  -- Last 5 results oldest-first.
  -- Inner query fetches 5 most recent (DESC), outer array_agg re-orders ASC.
  COALESCE(
    (
      SELECT array_agg(outcome ORDER BY kickoff_at ASC)
      FROM (
        SELECT
          f2.kickoff_at,
          CASE
            WHEN (f2.home_team_id = ct.id AND r2.home_score > r2.away_score)
              OR (f2.away_team_id = ct.id AND r2.away_score > r2.home_score) THEN 'W'
            WHEN r2.home_score = r2.away_score THEN 'D'
            ELSE 'L'
          END AS outcome
        FROM public.fixtures f2
        JOIN public.results  r2 ON r2.fixture_id = f2.id
        WHERE f2.competition_id = ct.competition_id
          AND (f2.home_team_id = ct.id OR f2.away_team_id = ct.id)
        ORDER BY f2.kickoff_at DESC
        LIMIT 5
      ) last5
    ),
    ARRAY[]::text[]
  )                      AS form
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
