-- PostgREST translates .insert().select() into INSERT ... RETURNING, which
-- requires SELECT privilege even though anon has no SELECT RLS policy.
-- No anon SELECT policy exists on either table, so this grant only enables
-- the RETURNING clause — anon still cannot query these tables directly.
GRANT SELECT ON public.access_requests      TO anon;
GRANT SELECT ON public.access_request_teams TO anon;
