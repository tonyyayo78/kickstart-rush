-- ============================================================
-- substitutions
--
-- Tracks Kickstart substitutions during live matches.
-- Mirrors the goals table shape: scoped to a fixture, timestamped
-- with half/minute/stoppage, recorded by an authenticated user.
--
-- Decisions (Brief 47):
--   - Kickstart subs only (no opposition subs — we don't have
--     opposition rosters).
--   - player_out_id and player_in_id are both required and
--     reference the players table.
--   - Validation trigger ensures player_out_id != player_in_id.
--   - No sub limit enforced in the database. UI shows a soft
--     counter only (U9/U11 are rolling subs; BFA U15 allows 5).
--   - RLS follows the goals_active_squad pattern from Brief 42:
--     any active squad-bearing authenticated user can write,
--     plus an approver bypass.
-- ============================================================

BEGIN;

CREATE TABLE public.substitutions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id          uuid        NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  player_out_id       uuid        NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  player_in_id        uuid        NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  half                int         NOT NULL CHECK (half IN (1, 2)),
  minute              int         NOT NULL CHECK (minute >= 1 AND minute <= 130),
  stoppage_minutes    int         NOT NULL DEFAULT 0 CHECK (stoppage_minutes >= 0 AND stoppage_minutes <= 20),
  recorded_by         uuid        REFERENCES public.profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX substitutions_fixture_idx ON public.substitutions (fixture_id);
CREATE INDEX substitutions_fixture_order_idx ON public.substitutions (fixture_id, half, minute, stoppage_minutes);

-- ── validation: out and in must be different players ──────────
CREATE OR REPLACE FUNCTION public.substitutions_validate_players()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.player_out_id = NEW.player_in_id THEN
    RAISE EXCEPTION 'player_out_id and player_in_id must be different';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER substitutions_validate_players
  BEFORE INSERT OR UPDATE ON public.substitutions
  FOR EACH ROW EXECUTE FUNCTION public.substitutions_validate_players();

-- ── updated_at maintenance ────────────────────────────────────
CREATE TRIGGER substitutions_set_updated_at
  BEFORE UPDATE ON public.substitutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── audit log ─────────────────────────────────────────────────
CREATE TRIGGER substitutions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.substitutions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.substitutions ENABLE ROW LEVEL SECURITY;

-- Active squad-bearing user OR approver can write substitutions
-- for any fixture. Pattern mirrors goals_active_squad from Brief 42.
CREATE POLICY substitutions_active_squad
  ON public.substitutions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_accessible_squads())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id = auth.uid()
        AND  is_approver = true
        AND  status = 'active'
        AND  removed_at IS NULL
    )
  );

COMMIT;
