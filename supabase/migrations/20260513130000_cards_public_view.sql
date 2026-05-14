-- ============================================================
-- cards_public_view
-- Extends public_results_with_scorers with a cards JSONB column.
--
-- Column allow-list (full view output):
--   competition_code     text        — unchanged
--   kickoff_at           timestamptz — unchanged
--   home_team_name       text        — unchanged
--   away_team_name       text        — unchanged
--   home_score           int         — unchanged
--   away_score           int         — unchanged
--   scorers              jsonb       — unchanged
--   cards                jsonb  NEW  — exposes: player_display_name,
--                                      card_type, minute only
--
-- No new GRANT needed — anon already has SELECT on this view
-- from 20260512130000. CREATE OR REPLACE preserves existing grants.
-- security_invoker=false preserved so view runs as owner, allowing
-- it to read public.cards which has no anon SELECT grant.
-- ============================================================

CREATE OR REPLACE VIEW public.public_results_with_scorers
  WITH (security_invoker = false)
AS
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
        'team_name',           gt.team_name,
        'player_display_name',
          CASE
            WHEN g.is_own_goal              THEN p.display_name || ' (OG)'
            WHEN p.display_name IS NOT NULL THEN p.display_name
            ELSE NULL
          END,
        'minute',              g.minute,
        'half',                g.half,
        'stoppage_minutes',    g.stoppage_minutes,
        'is_own_goal',         g.is_own_goal
      )
      ORDER BY g.half, g.minute NULLS LAST, g.stoppage_minutes, g.id
    )
    FROM   public.goals             g
    LEFT JOIN public.players        p  ON p.id  = g.player_id
    JOIN  public.competition_teams  gt ON gt.id = g.competition_team_id
    WHERE  g.result_id = r.id
  ), '[]'::jsonb) AS scorers,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'player_display_name', p2.display_name,
        'card_type',           cd.card_type,
        'minute',              cd.minute
      )
      ORDER BY cd.minute NULLS LAST, cd.id
    )
    FROM  public.cards   cd
    JOIN  public.players p2 ON p2.id = cd.player_id
    WHERE cd.fixture_id = f.id
  ), '[]'::jsonb) AS cards
FROM       public.results           r
JOIN       public.fixtures          f  ON f.id  = r.fixture_id
JOIN       public.competitions      c  ON c.id  = f.competition_id
JOIN       public.competition_teams ht ON ht.id = f.home_team_id
JOIN       public.competition_teams at ON at.id = f.away_team_id
WHERE      c.is_public  = true
  AND      f.status      = 'played'
ORDER BY   f.kickoff_at  DESC;
