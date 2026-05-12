-- Adds home_score and away_score to public_fixtures view so the
-- combined fixtures page can show played scorelines without a
-- separate query.  Both columns are NULL for scheduled/postponed
-- fixtures; populated via LEFT JOIN once a result is recorded.
--
-- Column allow-list after this migration:
--   competition_code   text
--   competition_name   text
--   kickoff_at         timestamptz
--   venue              text
--   status             text   (scheduled | played | postponed)
--   home_team_name     text
--   away_team_name     text
--   home_is_kickstart  boolean
--   away_is_kickstart  boolean
--   home_score         integer | null   (null when not played)
--   away_score         integer | null   (null when not played)
--
-- The anon role retains SELECT-only access; no new privileges.

DROP VIEW IF EXISTS public.public_fixtures;

CREATE VIEW public.public_fixtures
  WITH (security_invoker = false)
AS
SELECT
  c.code             AS competition_code,
  c.name             AS competition_name,
  f.kickoff_at,
  f.venue,
  f.status,
  ht.team_name       AS home_team_name,
  at.team_name       AS away_team_name,
  ht.is_kickstart    AS home_is_kickstart,
  at.is_kickstart    AS away_is_kickstart,
  r.home_score,
  r.away_score
FROM   public.fixtures           f
JOIN   public.competitions       c  ON c.id  = f.competition_id
JOIN   public.competition_teams  ht ON ht.id = f.home_team_id
JOIN   public.competition_teams  at ON at.id = f.away_team_id
LEFT JOIN public.results         r  ON r.fixture_id = f.id
WHERE  c.is_public = true
  AND  f.status IN ('scheduled', 'played', 'postponed')
ORDER  BY f.kickoff_at ASC;

GRANT SELECT ON public.public_fixtures TO anon;
