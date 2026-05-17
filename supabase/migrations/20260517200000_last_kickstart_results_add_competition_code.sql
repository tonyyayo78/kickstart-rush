-- Add competition_code to public_last_kickstart_results
--
-- The original view (20260512170000) keyed last-result lookup by kickstart
-- team id but did not expose the competition_code. standings/page.tsx worked
-- around this by building a Map<team_name, competition_code> from standings
-- rows — which broke once Brief 25 introduced multiple competitions that share
-- a Kickstart team name (e.g. "Kickstart Premier" in U9-A, U11-A, U13-A, U15).
--
-- This migration drops the old view and recreates it with competition_code so
-- each result row carries its own code directly.
--
-- Updated column allow-list:
--   kickstart_team_id    uuid
--   kickstart_team_name  text
--   competition_code     text   ← NEW
--   opponent_name        text
--   kickoff_at           timestamptz
--   kickstart_score      integer
--   opponent_score       integer
--   outcome              text  ('W' | 'D' | 'L')

DROP VIEW IF EXISTS public.public_last_kickstart_results;

CREATE VIEW public.public_last_kickstart_results
  WITH (security_invoker = false)
AS
SELECT DISTINCT ON (kt.id)
  kt.id              AS kickstart_team_id,
  kt.team_name       AS kickstart_team_name,
  c.code             AS competition_code,
  ot.team_name       AS opponent_name,
  f.kickoff_at,
  CASE WHEN f.home_team_id = kt.id
       THEN r.home_score ELSE r.away_score END  AS kickstart_score,
  CASE WHEN f.home_team_id = kt.id
       THEN r.away_score ELSE r.home_score END  AS opponent_score,
  CASE
    WHEN (f.home_team_id = kt.id AND r.home_score > r.away_score)
      OR (f.away_team_id = kt.id AND r.away_score > r.home_score) THEN 'W'
    WHEN r.home_score = r.away_score                              THEN 'D'
    ELSE                                                               'L'
  END                AS outcome
FROM       public.competition_teams kt
JOIN       public.competitions      c  ON c.id  = kt.competition_id AND c.is_public = true
JOIN       public.fixtures          f  ON f.competition_id = kt.competition_id
                                       AND (f.home_team_id = kt.id OR f.away_team_id = kt.id)
JOIN       public.results           r  ON r.fixture_id = f.id
JOIN       public.competition_teams ot ON ot.id = CASE
             WHEN f.home_team_id = kt.id THEN f.away_team_id
             ELSE f.home_team_id
           END
WHERE kt.is_kickstart = true
ORDER BY kt.id, f.kickoff_at DESC;

GRANT SELECT ON public.public_last_kickstart_results TO anon;
