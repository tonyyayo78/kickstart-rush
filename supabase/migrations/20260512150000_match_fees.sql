-- ============================================================
-- match_fees
-- Three-state presence model (row existence encodes selection):
--   No row             → not selected (no fee owed)
--   status = 'paid'    → selected, paid $5
--   status = 'exception' → selected, did not pay (note optional)
-- ============================================================

CREATE TABLE public.match_fees (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id   uuid        NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  player_id    uuid        NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  status       text        NOT NULL CHECK (status IN ('paid', 'exception')),
  amount       int         NOT NULL DEFAULT 500,  -- cents ($5.00 = 500)
  note         text,
  recorded_by  uuid        REFERENCES public.profiles(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, player_id)
);

CREATE INDEX match_fees_fixture_id_idx ON public.match_fees (fixture_id);

ALTER TABLE public.match_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_fees_owner_all ON public.match_fees
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE TRIGGER match_fees_set_updated_at
  BEFORE UPDATE ON public.match_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- audit_row_change uses TG_TABLE_NAME — no function changes needed
CREATE TRIGGER match_fees_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.match_fees
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
