-- ============================================================
-- public_views
-- Three read-only views for the anonymous public surface.
--
-- Security model (security_invoker = false):
--   Each view runs with the privileges of its owner (the migration
--   role, which inherits postgres) rather than the querying role.
--   This bypasses base-table RLS for anon queries. The view's SELECT
--   column list is the sole security boundary — base tables are
--   explicitly REVOKEd from the anon role below.
--   Do not add columns to any view without a PR that includes a
--   column allow-list table in the description.
-- ============================================================

-- ------------------------------------------------------------
-- View 1: public_fixtures
-- All non-cancelled fixtures from public competitions.
-- ------------------------------------------------------------

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
  at.is_kickstart    AS away_is_kickstart
FROM   public.fixtures           f
JOIN   public.competitions       c  ON c.id  = f.competition_id
JOIN   public.competition_teams  ht ON ht.id = f.home_team_id
JOIN   public.competition_teams  at ON at.id = f.away_team_id
WHERE  c.is_public = true
  AND  f.status IN ('scheduled', 'played', 'postponed')
ORDER  BY f.kickoff_at ASC;

-- ------------------------------------------------------------
-- View 2: public_results_with_scorers
-- ⚠️ PLACEHOLDER VIEW — Brief 5 must replace this view body in
-- full when the results table is introduced. Until then, results
-- returns no rows and standings returns played counts only;
-- all other stats are literal 0.
-- ------------------------------------------------------------

CREATE VIEW public.public_results_with_scorers
  WITH (security_invoker = false)
AS
SELECT
  c.code       AS competition_code,
  f.kickoff_at,
  ht.team_name AS home_team_name,
  at.team_name AS away_team_name,
  0::integer   AS home_score,
  0::integer   AS away_score,
  '[]'::jsonb  AS scorers
FROM   public.fixtures           f
JOIN   public.competitions       c  ON c.id  = f.competition_id
JOIN   public.competition_teams  ht ON ht.id = f.home_team_id
JOIN   public.competition_teams  at ON at.id = f.away_team_id
WHERE  FALSE;

-- ------------------------------------------------------------
-- View 3: public_standings
-- ⚠️ PLACEHOLDER VIEW — Brief 5 must replace this view body in
-- full when the results table is introduced. Until then, results
-- returns no rows and standings returns played counts only;
-- all other stats are literal 0.
--
-- played is computed from real fixture data (no fixtures have
-- status='played' yet, so it resolves to 0 without hardcoding).
-- All other stats require the results table Brief 5 will add.
-- ------------------------------------------------------------

CREATE VIEW public.public_standings
  WITH (security_invoker = false)
AS
SELECT
  c.code                        AS competition_code,
  c.name                        AS competition_name,
  ct.team_name,
  ct.is_kickstart,
  COUNT(pf.id)::integer         AS played,
  0::integer                    AS won,              -- Brief 5
  0::integer                    AS drawn,            -- Brief 5
  0::integer                    AS lost,             -- Brief 5
  0::integer                    AS goals_for,        -- Brief 5
  0::integer                    AS goals_against,    -- Brief 5
  0::integer                    AS goal_difference,  -- Brief 5
  0::integer                    AS points            -- Brief 5
FROM   public.competition_teams  ct
JOIN   public.competitions       c  ON c.id = ct.competition_id
LEFT JOIN public.fixtures pf ON
  pf.competition_id = ct.competition_id
  AND pf.status     = 'played'
  AND (pf.home_team_id = ct.id OR pf.away_team_id = ct.id)
WHERE  c.is_public = true
GROUP  BY c.code, c.name, ct.id, ct.team_name, ct.is_kickstart
ORDER  BY points DESC, goal_difference DESC, goals_for DESC, ct.team_name ASC;

-- ------------------------------------------------------------
-- Permissions
-- Revoke base-table access from anon (belt-and-suspenders alongside
-- RLS — documents intent explicitly).
-- ------------------------------------------------------------

REVOKE ALL ON public.competitions       FROM anon;
REVOKE ALL ON public.competition_teams  FROM anon;
REVOKE ALL ON public.fixtures           FROM anon;
REVOKE ALL ON public.players            FROM anon;
REVOKE ALL ON public.profiles           FROM anon;
REVOKE ALL ON public.squads             FROM anon;
REVOKE ALL ON public.audit_log          FROM anon;

GRANT SELECT ON public.public_fixtures              TO anon;
GRANT SELECT ON public.public_results_with_scorers  TO anon;
GRANT SELECT ON public.public_standings             TO anon;
