-- ============================================================
-- Kickstart Rush seed data
-- BFA Dasani Youth Powerade 2026 Football Tournament U15
-- All INSERTs are idempotent (ON CONFLICT DO NOTHING or WHERE NOT EXISTS).
-- To apply to a hosted Supabase project:
--   supabase db query --linked -f supabase/seed.sql
-- ============================================================

-- ------------------------------------------------------------
-- Squads
-- ------------------------------------------------------------

INSERT INTO public.squads (code, name, age_group, season)
VALUES
  ('KE2026', 'Kickstart Elite',   'U15', '2026'),
  ('KP2026', 'Kickstart Premier', 'U15', '2026')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- Competitions
-- ------------------------------------------------------------

INSERT INTO public.competitions (name, code, stage, season)
VALUES
  ('BFA Dasani Youth Powerade 2026 U15 Zone A', 'BFA-U15-2026-ZA', 'qualifier', '2026'),
  ('BFA Dasani Youth Powerade 2026 U15 Zone B', 'BFA-U15-2026-ZB', 'qualifier', '2026')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- Competition teams — Zone A
-- ------------------------------------------------------------

INSERT INTO public.competition_teams (competition_id, team_name, is_kickstart, squad_id)
SELECT
  c.id,
  t.team_name,
  t.is_kickstart,
  CASE WHEN t.is_kickstart THEN (SELECT id FROM public.squads WHERE code = 'KE2026') END
FROM public.competitions c
CROSS JOIN (VALUES
  ('Empire Club',              false),
  ('FM Four Pillars',          false),
  ('Kickstart Elite',          true),
  ('National Sports Council',  false),
  ('Potential Ballers',        false),
  ('Pro Shottas Utd',          false),
  ('St. Philip Academy',       false),
  ('Technique FC',             false)
) AS t(team_name, is_kickstart)
WHERE c.code = 'BFA-U15-2026-ZA'
ON CONFLICT (competition_id, team_name) DO NOTHING;

-- ------------------------------------------------------------
-- Competition teams — Zone B
-- ------------------------------------------------------------

INSERT INTO public.competition_teams (competition_id, team_name, is_kickstart, squad_id)
SELECT
  c.id,
  t.team_name,
  t.is_kickstart,
  CASE WHEN t.is_kickstart THEN (SELECT id FROM public.squads WHERE code = 'KP2026') END
FROM public.competitions c
CROSS JOIN (VALUES
  ('First Touch FC',           false),
  ('Kickstart Premier',        true),
  ('Mavericks SC',             false),
  ('Notre Dame SC',            false),
  ('Pinelands',                false),
  ('Pro Shottas Spurs',        false),
  ('United Stars Alliance',    false),
  ('Whitehall FA',             false)
) AS t(team_name, is_kickstart)
WHERE c.code = 'BFA-U15-2026-ZB'
ON CONFLICT (competition_id, team_name) DO NOTHING;

-- ------------------------------------------------------------
-- Fixtures — Zone A (28 matches)
-- All times in Barbados local (UTC-4, no DST).
-- ------------------------------------------------------------

WITH za AS (SELECT id FROM public.competitions WHERE code = 'BFA-U15-2026-ZA'),
     empire         AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'Empire Club'),
     fm4p           AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'FM Four Pillars'),
     ke             AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'Kickstart Elite'),
     nsc            AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'National Sports Council'),
     potbal         AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'Potential Ballers'),
     psutd          AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'Pro Shottas Utd'),
     stphilip       AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'St. Philip Academy'),
     technique      AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM za) AND team_name = 'Technique FC'),
     fixtures_to_insert(competition_id, home_team_id, away_team_id, kickoff_at, venue) AS (
  VALUES
    -- May 09
    ((SELECT id FROM za), (SELECT id FROM empire),   (SELECT id FROM fm4p),     '2026-05-09 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM technique),(SELECT id FROM ke),        '2026-05-09 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM psutd),    (SELECT id FROM potbal),   '2026-05-09 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM stphilip), (SELECT id FROM nsc),      '2026-05-09 08:30:00-04:00'::timestamptz, 'Blenheim'),
    -- May 16
    ((SELECT id FROM za), (SELECT id FROM nsc),      (SELECT id FROM technique),'2026-05-16 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM potbal),   (SELECT id FROM empire),   '2026-05-16 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM fm4p),     (SELECT id FROM stphilip), '2026-05-16 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM ke),       (SELECT id FROM psutd),    '2026-05-16 08:30:00-04:00'::timestamptz, 'Blenheim'),
    -- May 23
    ((SELECT id FROM za), (SELECT id FROM fm4p),     (SELECT id FROM potbal),   '2026-05-23 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM psutd),    (SELECT id FROM nsc),      '2026-05-23 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM stphilip), (SELECT id FROM technique),'2026-05-23 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM empire),   (SELECT id FROM ke),       '2026-05-23 09:50:00-04:00'::timestamptz, 'Blenheim'),
    -- May 30
    ((SELECT id FROM za), (SELECT id FROM technique),(SELECT id FROM psutd),    '2026-05-30 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM ke),       (SELECT id FROM fm4p),     '2026-05-30 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM nsc),      (SELECT id FROM empire),   '2026-05-30 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM potbal),   (SELECT id FROM stphilip), '2026-05-30 09:50:00-04:00'::timestamptz, 'Blenheim'),
    -- June 06
    ((SELECT id FROM za), (SELECT id FROM potbal),   (SELECT id FROM ke),       '2026-06-06 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM empire),   (SELECT id FROM technique),'2026-06-06 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM stphilip), (SELECT id FROM psutd),    '2026-06-06 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM fm4p),     (SELECT id FROM nsc),      '2026-06-06 08:30:00-04:00'::timestamptz, 'Blenheim'),
    -- June 20
    ((SELECT id FROM za), (SELECT id FROM psutd),    (SELECT id FROM empire),   '2026-06-20 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM nsc),      (SELECT id FROM potbal),   '2026-06-20 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM technique),(SELECT id FROM fm4p),     '2026-06-20 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM za), (SELECT id FROM ke),       (SELECT id FROM stphilip), '2026-06-20 08:30:00-04:00'::timestamptz, 'Blenheim'),
    -- June 27
    ((SELECT id FROM za), (SELECT id FROM ke),       (SELECT id FROM nsc),      '2026-06-27 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM stphilip), (SELECT id FROM empire),   '2026-06-27 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM fm4p),     (SELECT id FROM psutd),    '2026-06-27 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM za), (SELECT id FROM potbal),   (SELECT id FROM technique),'2026-06-27 09:50:00-04:00'::timestamptz, 'Blenheim')
)
INSERT INTO public.fixtures (competition_id, home_team_id, away_team_id, kickoff_at, venue)
SELECT f.competition_id, f.home_team_id, f.away_team_id, f.kickoff_at, f.venue
FROM fixtures_to_insert f
WHERE NOT EXISTS (
  SELECT 1 FROM public.fixtures x
  WHERE x.competition_id = f.competition_id
    AND x.home_team_id   = f.home_team_id
    AND x.away_team_id   = f.away_team_id
    AND x.kickoff_at     = f.kickoff_at
);

-- ------------------------------------------------------------
-- Fixtures — Zone B (28 matches)
-- ------------------------------------------------------------

WITH zb AS (SELECT id FROM public.competitions WHERE code = 'BFA-U15-2026-ZB'),
     firsttouch     AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'First Touch FC'),
     kp             AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'Kickstart Premier'),
     mavericks      AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'Mavericks SC'),
     notredame      AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'Notre Dame SC'),
     pinelands      AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'Pinelands'),
     psspurs        AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'Pro Shottas Spurs'),
     usa            AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'United Stars Alliance'),
     whitehall      AS (SELECT id FROM public.competition_teams WHERE competition_id = (SELECT id FROM zb) AND team_name = 'Whitehall FA'),
     fixtures_to_insert(competition_id, home_team_id, away_team_id, kickoff_at, venue) AS (
  VALUES
    -- May 09
    ((SELECT id FROM zb), (SELECT id FROM usa),       (SELECT id FROM firsttouch), '2026-05-09 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM whitehall), (SELECT id FROM kp),         '2026-05-09 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM psspurs),   (SELECT id FROM mavericks),  '2026-05-09 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM notredame), (SELECT id FROM pinelands),  '2026-05-09 09:50:00-04:00'::timestamptz, 'Blenheim'),
    -- May 16
    ((SELECT id FROM zb), (SELECT id FROM kp),        (SELECT id FROM psspurs),    '2026-05-16 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM mavericks), (SELECT id FROM usa),        '2026-05-16 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM firsttouch),(SELECT id FROM notredame),  '2026-05-16 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM pinelands), (SELECT id FROM whitehall),  '2026-05-16 09:50:00-04:00'::timestamptz, 'Blenheim'),
    -- May 23
    ((SELECT id FROM zb), (SELECT id FROM usa),       (SELECT id FROM kp),         '2026-05-23 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM firsttouch),(SELECT id FROM mavericks),  '2026-05-23 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM psspurs),   (SELECT id FROM pinelands),  '2026-05-23 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM notredame), (SELECT id FROM whitehall),  '2026-05-23 08:30:00-04:00'::timestamptz, 'Blenheim'),
    -- May 30
    ((SELECT id FROM zb), (SELECT id FROM whitehall), (SELECT id FROM psspurs),    '2026-05-30 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM kp),        (SELECT id FROM firsttouch), '2026-05-30 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM pinelands), (SELECT id FROM usa),        '2026-05-30 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM mavericks), (SELECT id FROM notredame),  '2026-05-30 08:30:00-04:00'::timestamptz, 'Blenheim'),
    -- June 06
    ((SELECT id FROM zb), (SELECT id FROM firsttouch),(SELECT id FROM pinelands),  '2026-06-06 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM usa),       (SELECT id FROM whitehall),  '2026-06-06 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM mavericks), (SELECT id FROM kp),         '2026-06-06 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM notredame), (SELECT id FROM psspurs),    '2026-06-06 09:50:00-04:00'::timestamptz, 'Blenheim'),
    -- June 20
    ((SELECT id FROM zb), (SELECT id FROM whitehall), (SELECT id FROM firsttouch), '2026-06-20 08:30:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM kp),        (SELECT id FROM notredame),  '2026-06-20 09:50:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM pinelands), (SELECT id FROM mavericks),  '2026-06-20 11:10:00-04:00'::timestamptz, 'BFA Technical Centre'),
    ((SELECT id FROM zb), (SELECT id FROM psspurs),   (SELECT id FROM usa),        '2026-06-20 09:50:00-04:00'::timestamptz, 'Blenheim'),
    -- June 27
    ((SELECT id FROM zb), (SELECT id FROM kp),        (SELECT id FROM pinelands),  '2026-06-27 08:30:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM mavericks), (SELECT id FROM whitehall),  '2026-06-27 09:50:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM firsttouch),(SELECT id FROM psspurs),    '2026-06-27 11:10:00-04:00'::timestamptz, 'Blenheim'),
    ((SELECT id FROM zb), (SELECT id FROM notredame), (SELECT id FROM usa),        '2026-06-27 08:30:00-04:00'::timestamptz, 'Blenheim')
)
INSERT INTO public.fixtures (competition_id, home_team_id, away_team_id, kickoff_at, venue)
SELECT f.competition_id, f.home_team_id, f.away_team_id, f.kickoff_at, f.venue
FROM fixtures_to_insert f
WHERE NOT EXISTS (
  SELECT 1 FROM public.fixtures x
  WHERE x.competition_id = f.competition_id
    AND x.home_team_id   = f.home_team_id
    AND x.away_team_id   = f.away_team_id
    AND x.kickoff_at     = f.kickoff_at
);
