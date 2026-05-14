-- The RLS policies allowing anon INSERT were created in
-- 20260513070000_access_requests_anon_insert.sql but the underlying
-- table-level GRANTs were never issued. PostgreSQL checks privileges
-- before RLS, so every submission hit 42501 before the policy ran.
GRANT INSERT ON public.access_requests      TO anon;
GRANT INSERT ON public.access_request_teams TO anon;
