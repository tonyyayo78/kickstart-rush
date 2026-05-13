-- ============================================================
-- seed_premier_roster
-- Inserts 18 Kickstart Premier (KP2026) players with names only.
-- DOB and jersey numbers are NULL; those get filled via the UI.
--
-- The brief referred to a "position" column. The actual column is
-- "preferred_position". Nalani Gullstone and Viren Pardasani are
-- inserted with preferred_position = 'GK'.
--
-- Idempotent: each row is skipped if (squad_id, first_name,
-- last_name) already exists. No unique constraint exists on that
-- triple so WHERE NOT EXISTS is used instead of ON CONFLICT.
-- ============================================================

DO $$
DECLARE
  v_squad_id uuid;
BEGIN
  SELECT id INTO v_squad_id FROM public.squads WHERE code = 'KP2026';
  IF v_squad_id IS NULL THEN
    RAISE EXCEPTION 'KP2026 squad not found — cannot seed Premier roster';
  END IF;

  INSERT INTO public.players (squad_id, first_name, last_name, preferred_position)
  SELECT v_squad_id, r.first_name, r.last_name, r.preferred_position
  FROM (VALUES
    ('Aamir',   'John',       NULL::player_position),
    ('Caleb',   'Hinds',      NULL),
    ('Brent',   'Lashley',    NULL),
    ('Quityne', 'Lowe',       NULL),
    ('Hosea',   'Phillips',   NULL),
    ('Kaiden',  'Browne',     NULL),
    ('Logan',   'Pounder',    NULL),
    ('Keshon',  'Atkins',     NULL),
    ('Jacobi',  'Lovell',     NULL),
    ('Blake',   'Corbin',     NULL),
    ('Jude',    'McKnight',   NULL),
    ('Jayquan', 'Stuart',     NULL),
    ('Logan',   'Marshall',   NULL),
    ('Nalani',  'Gullstone',  'GK'),
    ('Viren',   'Pardasani',  'GK'),
    ('Chaeden', 'Slocombe',   NULL),
    ('C''jae',  'Nicholls',   NULL),
    ('Milan',   'Maynard',    NULL)
  ) AS r(first_name, last_name, preferred_position)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.squad_id   = v_squad_id
      AND p.first_name = r.first_name
      AND p.last_name  = r.last_name
      AND p.deleted_at IS NULL
  );
END $$;
