-- ============================================================
-- user_model_phase_a
-- Additive migration — no existing RLS policies are changed.
-- Adds new columns to profiles, creates profile_teams,
-- access_requests, and access_request_teams tables.
--
-- Phase B (separate migration) will drop the profiles_role enum,
-- create the user_accessible_squads() helper, and replace all
-- role='owner' policies with squad-scoped equivalents.
-- ============================================================

-- ── profiles additions ─────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name  text,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'denied')),
  ADD COLUMN IF NOT EXISTS is_approver boolean NOT NULL DEFAULT false;

-- ── profile_teams ──────────────────────────────────────────────────────────

CREATE TABLE public.profile_teams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  squad_id    uuid        NOT NULL REFERENCES public.squads(id)   ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, squad_id)
);

ALTER TABLE public.profile_teams ENABLE ROW LEVEL SECURITY;

-- Each user may read their own squad assignments.
CREATE POLICY profile_teams_self_select
  ON public.profile_teams FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Mutations are owner-only for now; Phase B replaces with is_approver.
CREATE POLICY profile_teams_owner_write
  ON public.profile_teams FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE TRIGGER profile_teams_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profile_teams
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ── access_requests ────────────────────────────────────────────────────────

CREATE TABLE public.access_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        NOT NULL,
  first_name   text        NOT NULL,
  last_name    text        NOT NULL,
  role         text        NOT NULL CHECK (role IN ('Coach', 'Manager', 'Technical Director')),
  status       text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at   timestamptz,
  decided_by   uuid        REFERENCES public.profiles(id),
  notes        text
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Visible only to approvers; Phase B replaces role='owner' with is_approver=true.
CREATE POLICY access_requests_owner_all
  ON public.access_requests FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE TRIGGER access_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ── access_request_teams ───────────────────────────────────────────────────

CREATE TABLE public.access_request_teams (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid  NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
  squad_id    uuid  NOT NULL REFERENCES public.squads(id)          ON DELETE CASCADE,
  UNIQUE (request_id, squad_id)
);

ALTER TABLE public.access_request_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_request_teams_owner_all
  ON public.access_request_teams FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE TRIGGER access_request_teams_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.access_request_teams
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ── anon revoke (belt-and-suspenders) ─────────────────────────────────────

REVOKE ALL ON public.profile_teams          FROM anon;
REVOKE ALL ON public.access_requests        FROM anon;
REVOKE ALL ON public.access_request_teams   FROM anon;

-- ── seed: owner profile ────────────────────────────────────────────────────

UPDATE public.profiles
SET
  first_name  = 'Antonio',
  status      = 'active',
  is_approver = true
WHERE email = 'alythcott@gmail.com';

-- ── seed: owner → all squads ───────────────────────────────────────────────

INSERT INTO public.profile_teams (profile_id, squad_id)
SELECT p.id, s.id
FROM   public.profiles p
CROSS  JOIN public.squads s
WHERE  p.email = 'alythcott@gmail.com'
ON CONFLICT (profile_id, squad_id) DO NOTHING;

-- ── update handle_new_user ─────────────────────────────────────────────────
-- Still gates on the allow-list email. Now also sets status='active' and
-- is_approver=true on creation. role='owner' (ENUM) stays for now;
-- Phase B will remove it when the ENUM is dropped.

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  owner_email text;
BEGIN
  SELECT value INTO owner_email
  FROM public.app_config
  WHERE key = 'owner_email';

  IF owner_email IS NULL OR NEW.email IS DISTINCT FROM owner_email THEN
    RAISE EXCEPTION 'Email not authorised';
  END IF;

  INSERT INTO public.profiles (id, email, role, status, is_approver)
  VALUES (NEW.id, NEW.email, 'owner', 'active', true);

  RETURN NEW;
END;
$$;
