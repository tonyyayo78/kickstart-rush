-- ============================================================
-- competitions_fixtures_players
-- Enums, audit infrastructure, competitions, competition_teams,
-- fixtures, and players tables with RLS and triggers.
-- Seed data lives in supabase/seed.sql (see decision below).
-- ============================================================

CREATE TYPE public.player_position  AS ENUM ('GK','DEF','MID','FWD');
CREATE TYPE public.player_status    AS ENUM ('active','injured','unavailable','inactive');
CREATE TYPE public.competition_stage AS ENUM ('qualifier','super_8','plate','friendly','other');
CREATE TYPE public.fixture_status   AS ENUM ('scheduled','played','postponed','cancelled');

-- ------------------------------------------------------------
-- Audit infrastructure
-- ------------------------------------------------------------

CREATE TABLE public.audit_log (
  id          bigserial    PRIMARY KEY,
  table_name  text         NOT NULL,
  row_id      uuid         NOT NULL,
  action      text         NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by  uuid         REFERENCES public.profiles(id),
  changed_at  timestamptz  NOT NULL DEFAULT now(),
  before_data jsonb,
  after_data  jsonb
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_owner_select ON public.audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE INDEX audit_log_lookup_idx ON public.audit_log (table_name, row_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.audit_row_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, row_id, action, changed_by, before_data, after_data)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP, auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL;
END; $$;

-- ------------------------------------------------------------
-- competitions
-- ------------------------------------------------------------

CREATE TABLE public.competitions (
  id                uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text                    NOT NULL,
  code              text                    UNIQUE NOT NULL,
  stage             public.competition_stage NOT NULL,
  season            text                    NOT NULL,
  points_for_win    int                     NOT NULL DEFAULT 3,
  points_for_draw   int                     NOT NULL DEFAULT 1,
  is_public         boolean                 NOT NULL DEFAULT true,
  created_at        timestamptz             NOT NULL DEFAULT now()
);
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY competitions_owner_all ON public.competitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- ------------------------------------------------------------
-- competition_teams
-- ------------------------------------------------------------

CREATE TABLE public.competition_teams (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid        NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_name      text        NOT NULL,
  is_kickstart   boolean     NOT NULL DEFAULT false,
  squad_id       uuid        REFERENCES public.squads(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, team_name)
);
ALTER TABLE public.competition_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY competition_teams_owner_all ON public.competition_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- ------------------------------------------------------------
-- fixtures
-- NOTE: home_team_id and away_team_id are not FK-bound to the same
-- competition_id. Postgres CHECK constraints can't subquery, and a
-- trigger guard would be heavier than the actual risk. Seed data and
-- the application layer enforce the invariant.
-- ------------------------------------------------------------

CREATE TABLE public.fixtures (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid                  NOT NULL REFERENCES public.competitions(id),
  home_team_id   uuid                  NOT NULL REFERENCES public.competition_teams(id),
  away_team_id   uuid                  NOT NULL REFERENCES public.competition_teams(id),
  kickoff_at     timestamptz           NOT NULL,
  venue          text                  NOT NULL,
  status         public.fixture_status NOT NULL DEFAULT 'scheduled',
  notes          text,
  created_at     timestamptz           NOT NULL DEFAULT now(),
  updated_at     timestamptz           NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id)
);
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixtures_owner_all ON public.fixtures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE INDEX fixtures_competition_kickoff_idx ON public.fixtures (competition_id, kickoff_at);
CREATE TRIGGER fixtures_set_updated_at BEFORE UPDATE ON public.fixtures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fixtures_audit AFTER INSERT OR UPDATE OR DELETE ON public.fixtures
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ------------------------------------------------------------
-- players
-- ------------------------------------------------------------

CREATE TABLE public.players (
  id                   uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id             uuid                   NOT NULL REFERENCES public.squads(id) ON DELETE RESTRICT,
  first_name           text                   NOT NULL,
  last_name            text                   NOT NULL,
  -- NOTE: if per-player overrides are needed later, drop and recreate this column
  -- as a regular text column populated by a BEFORE INSERT trigger.
  -- The current immutable form keeps MVP simple.
  display_name         text                   GENERATED ALWAYS AS (LEFT(first_name, 1) || '. ' || last_name) STORED,
  date_of_birth        date                   NOT NULL,
  preferred_position   public.player_position NOT NULL,
  jersey_number        int                    CHECK (jersey_number BETWEEN 1 AND 99),
  status               public.player_status   NOT NULL DEFAULT 'active',
  photo_url            text,
  notes_summary        text,
  eligibility_override boolean                NOT NULL DEFAULT false,
  created_at           timestamptz            NOT NULL DEFAULT now(),
  updated_at           timestamptz            NOT NULL DEFAULT now(),
  deleted_at           timestamptz,
  CHECK (
    eligibility_override = true
    OR (date_of_birth >= DATE '2011-01-01' AND date_of_birth <= DATE '2013-12-31')
  )
);
CREATE UNIQUE INDEX players_squad_jersey_active_uidx ON public.players (squad_id, jersey_number)
  WHERE deleted_at IS NULL AND jersey_number IS NOT NULL;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY players_owner_all ON public.players FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE TRIGGER players_set_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER players_audit AFTER INSERT OR UPDATE OR DELETE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
