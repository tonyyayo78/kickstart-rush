-- ============================================================
-- grant_owner_access_to_brief_25_squads
--
-- Brief 25 inserted 8 new Kickstart squads (KE/KP/KS-U9-2026,
-- KE/KP-U11-2026, KE/KP-U13-2026, K-U17-2026) but did not seed
-- the corresponding profile_teams rows for the owner. Because
-- the fixtures_active_squad RLS policy gates visibility on
-- user_accessible_squads() — which reads profile_teams — those
-- 8 squads were outside the owner's accessible set, hiding all
-- 278 fixtures (and their lineups, results, fees, cards) from
-- the authenticated /(app)/* pages.
--
-- This migration replays the canonical seed from
-- user_model_phase_a:
--   INSERT all (owner_profile_id, squad_id) pairs that don't
--   yet exist. Idempotent via ON CONFLICT DO NOTHING.
--
-- Self-healing: any future squad inserted before another run
-- of this seed pattern will also be picked up.
--
-- Scope: grants access to the email-allow-listed owner only.
-- Future approver accounts get squad assignments via the
-- normal access-request approval flow (admin UI), not this
-- migration.
-- ============================================================

BEGIN;

INSERT INTO public.profile_teams (profile_id, squad_id)
SELECT p.id, s.id
FROM   public.profiles p
CROSS  JOIN public.squads s
WHERE  p.email = 'alythcott@gmail.com'
  AND  p.status = 'active'
ON CONFLICT (profile_id, squad_id) DO NOTHING;

COMMIT;
