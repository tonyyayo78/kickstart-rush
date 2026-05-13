-- lineups: one per fixture — records the chosen formation
-- lineup_players: one row per starter slot or bench position
-- Slot order 1-11 for starters (matches formation slot numbering)
-- Slot order 1-11 for subs (at most 11 bench players)
-- UNIQUE(lineup_id, player_id) prevents double-listing the same player.
-- UNIQUE(lineup_id, role, slot_order) prevents two players in the same slot.

CREATE TABLE public.lineups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id  uuid        NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  formation   text        NOT NULL CHECK (formation IN ('4-4-2','4-3-3','4-2-3-1','3-5-2','3-4-3')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES public.profiles(id),
  UNIQUE (fixture_id)
);

CREATE INDEX lineups_fixture_id_idx ON public.lineups (fixture_id);

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY lineups_owner_all ON public.lineups
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE TRIGGER lineups_set_updated_at
  BEFORE UPDATE ON public.lineups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER lineups_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.lineups
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ── lineup_players ────────────────────────────────────────────────────────────

CREATE TABLE public.lineup_players (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  lineup_id       uuid  NOT NULL REFERENCES public.lineups(id) ON DELETE CASCADE,
  player_id       uuid  NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  role            text  NOT NULL CHECK (role IN ('starter', 'sub')),
  position_label  text,
  slot_order      int   NOT NULL CHECK (slot_order BETWEEN 1 AND 11),
  UNIQUE (lineup_id, player_id),
  UNIQUE (lineup_id, role, slot_order)
);

CREATE INDEX lineup_players_lineup_id_idx ON public.lineup_players (lineup_id);

ALTER TABLE public.lineup_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY lineup_players_owner_all ON public.lineup_players
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE TRIGGER lineup_players_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.lineup_players
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
