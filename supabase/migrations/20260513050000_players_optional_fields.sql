-- ============================================================
-- players_optional_fields
-- Drops NOT NULL from date_of_birth and preferred_position so
-- players can be created with only first_name + last_name.
--
-- date_of_birth is explicitly called out in Brief 14a.
-- preferred_position also needs to be nullable: it has no DEFAULT
-- and no NOT NULL bypass, so any INSERT omitting it would fail at
-- the DB level even if the app-level Zod schema marks it optional.
--
-- jersey_number, notes_summary, photo_url are already nullable.
-- status has DEFAULT 'active' and needs no change.
-- No RLS changes.
-- ============================================================

ALTER TABLE public.players
  ALTER COLUMN date_of_birth      DROP NOT NULL,
  ALTER COLUMN preferred_position DROP NOT NULL;

-- Drop the hard unique index on (squad_id, jersey_number) so duplicate
-- jersey numbers are a soft warning in the UI, not a DB-level block.
DROP INDEX IF EXISTS public.players_squad_jersey_active_uidx;
