-- ============================================================
-- fix_user_accessible_squads
-- Removes SECURITY DEFINER from user_accessible_squads().
--
-- Root cause: SECURITY DEFINER caused the function to run as
-- the postgres superuser role, where auth.uid() returned NULL
-- (PostgREST's request.jwt.claims GUC is not accessible from
-- the postgres role context). Every squad-scoped RLS policy
-- called this function, so auth returned zero rows for all
-- authenticated users — fixtures, players, fees, lineups all
-- showed empty.
--
-- Fix: run as the authenticated caller instead. profile_teams
-- and profiles are readable by the caller via their self-select
-- policies, and auth.uid() resolves correctly in that context.
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_accessible_squads()
  RETURNS TABLE(squad_id uuid)
  LANGUAGE sql
  STABLE
  SET search_path = public
AS $$
  SELECT pt.squad_id
  FROM   public.profile_teams pt
  JOIN   public.profiles p ON p.id = pt.profile_id
  WHERE  pt.profile_id = auth.uid()
    AND  p.status = 'active'
$$;
