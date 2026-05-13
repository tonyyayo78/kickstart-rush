-- ============================================================
-- access_requests_anon_insert
-- Grants anon INSERT-only on access_requests and
-- access_request_teams so any visitor can submit a request.
-- No SELECT, UPDATE, or DELETE is granted to anon on either table.
--
-- Supporting SECURITY DEFINER functions are included here because
-- they exist solely to support the two RLS policies below.
--
-- Does NOT touch profiles, profile_teams, squads, fixtures,
-- or any other table's policies.
-- ============================================================

-- Lets the access_request_teams INSERT policy confirm the parent
-- request exists and is still pending — bypasses anon RLS on
-- access_requests so the check can actually read the row.
CREATE OR REPLACE FUNCTION public.fn_access_request_is_pending(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE id = p_request_id AND status = 'pending'
  );
$$;

-- Lets the server action detect whether an email already has a
-- pending request (duplicate suppression) without granting anon
-- SELECT on access_requests.
CREATE OR REPLACE FUNCTION public.fn_access_request_email_pending(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE lower(email) = lower(p_email) AND status = 'pending'
  );
$$;

-- Returns the squad list for the public request-access form without
-- granting anon SELECT on the squads table directly.
CREATE OR REPLACE FUNCTION public.fn_public_squads()
RETURNS TABLE(id uuid, name text, code text, age_group text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, code, age_group FROM public.squads ORDER BY name;
$$;

-- ── RLS policies ──────────────────────────────────────────────

-- anon may INSERT into access_requests only with status = 'pending'.
CREATE POLICY access_requests_anon_insert
  ON public.access_requests FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- anon may INSERT into access_request_teams only when the referenced
-- request exists and is pending (checked via SECURITY DEFINER above).
CREATE POLICY access_request_teams_anon_insert
  ON public.access_request_teams FOR INSERT TO anon
  WITH CHECK (public.fn_access_request_is_pending(request_id));
