-- ============================================================
-- init_profiles_squads
-- Profiles, squads, and app_config tables; RLS; and the
-- handle_new_user trigger that gates account creation to the
-- allow-listed owner email stored in app_config.
--
-- To change the allow-listed email, run in the SQL Editor:
--   UPDATE public.app_config SET value = '<email>' WHERE key = 'owner_email';
-- ============================================================


-- ------------------------------------------------------------
-- Enum
-- Phase 2: ALTER TYPE public.profiles_role ADD VALUE 'coach';
--           ALTER TYPE public.profiles_role ADD VALUE 'viewer';
-- ------------------------------------------------------------
CREATE TYPE public.profiles_role AS ENUM ('owner');


-- ------------------------------------------------------------
-- app_config
-- Holds server-side configuration that must not be readable by
-- authenticated clients. No RLS policies — only SECURITY DEFINER
-- functions (e.g. handle_new_user) can read rows from this table.
-- ------------------------------------------------------------
CREATE TABLE public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_config (key, value)
VALUES ('owner_email', 'alythcott@gmail.com');


-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE public.profiles (
  id                uuid                 PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text                 NOT NULL,
  display_name      text,
  role              public.profiles_role NOT NULL DEFAULT 'owner',
  assigned_squad_id uuid,                -- Phase 2 placeholder; FK to squads added in a later migration
  created_at        timestamptz          NOT NULL DEFAULT now()
);

CREATE TABLE public.squads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text        UNIQUE NOT NULL,
  name       text        NOT NULL,
  age_group  text        NOT NULL,
  season     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- Row-Level Security
-- ------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads   ENABLE ROW LEVEL SECURITY;

-- Profiles: each authenticated user may only read their own row.
-- No INSERT policy — rows are created exclusively by the
-- handle_new_user trigger (SECURITY DEFINER), which bypasses RLS.
CREATE POLICY profiles_self_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Profiles: each authenticated user may only update their own row.
CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Squads: full CRUD for any authenticated caller whose profile
-- has role = 'owner'. Subquery avoids a self-join on profiles.
CREATE POLICY squads_owner_all
  ON public.squads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.profiles
      WHERE  id   = auth.uid()
        AND  role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.profiles
      WHERE  id   = auth.uid()
        AND  role = 'owner'
    )
  );


-- ------------------------------------------------------------
-- handle_new_user
--
-- Fires AFTER INSERT on auth.users.
--   • NEW.email matches app_config owner_email  → creates a profiles row.
--   • No match (or config row absent)            → raises exception,
--     rolling back the auth.users INSERT entirely.
--
-- Defence-in-depth: the signInWithEmail server action already
-- rejects unauthorised emails before they reach Supabase Auth.
-- This trigger ensures no account can be created even if the
-- app layer is bypassed.
-- ------------------------------------------------------------

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

  -- Fail closed: absent config row or mismatched email blocks the INSERT.
  IF owner_email IS NULL OR NEW.email IS DISTINCT FROM owner_email THEN
    RAISE EXCEPTION 'Email not authorised';
  END IF;

  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
