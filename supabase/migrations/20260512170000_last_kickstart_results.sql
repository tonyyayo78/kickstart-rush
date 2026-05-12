-- New view: public_last_kickstart_results
-- Returns the single most recent completed result for each Kickstart
-- competition_team. DISTINCT ON (kt.id) + ORDER BY kickoff_at DESC
-- is the standard Postgres "latest per group" pattern.
--
-- Kickstart score is always first (kickstart_score / opponent_score),
-- regardless of home/away in the underlying fixture row.
--
-- Column allow-list:
--   kickstart_team_id    uuid
--   kickstart_team_name  text
--   opponent_name        text
--   kickoff_at           timestamptz
--   kickstart_score      integer
--   opponent_score       integer
--   outcome              text  ('W' | 'D' | 'L')

CREATE VIEW public.public_last_kickstart_results
  WITH (security_invoker = false)
AS
SELECT DISTINCT ON (kt.id)
  kt.id              AS kickstart_team_id,
  kt.team_name       AS kickstart_team_name,
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
