-- ============================================================
-- cards_table
-- Disciplinary card tracking for Kickstart fixtures.
-- Kickstart players only; opposition cards are out of scope.
--
-- RLS: owner_all — matches every other match-data table
--   (goals, results, lineups, match_fees all use the same
--   owner-role check rather than squad-scoped policies).
--
-- player_id is NOT NULL + ON DELETE RESTRICT because a card
--   without a known player is meaningless for discipline tracking.
-- minute allows 0 (kick-off scenarios) unlike goals (min 1).
-- ============================================================

CREATE TABLE public.cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id  uuid        NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  player_id   uuid        NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  card_type   text        NOT NULL CHECK (card_type IN ('yellow','red','second_yellow')),
  minute      int         CHECK (minute BETWEEN 0 AND 130),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES public.profiles(id)
);

CREATE INDEX cards_fixture_id_idx ON public.cards (fixture_id);
CREATE INDEX cards_player_id_idx  ON public.cards (player_id);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY cards_owner_all ON public.cards FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE TRIGGER cards_audit AFTER INSERT OR UPDATE OR DELETE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
