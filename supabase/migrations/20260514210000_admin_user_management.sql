-- ============================================================
-- admin_user_management
-- Adds removed_at to profiles for soft-delete, and changes FK
-- ON DELETE behaviour so that Purge (auth.users hard delete) leaves
-- historical audit rows, results, fees, etc. intact with the
-- authorship column set to NULL ("anonymised").
--
-- Pre-write FK inspection report is in the PR description.
-- Notable: admin_audit_log.actor_id was NOT NULL — must be made
-- nullable before the SET NULL FK can fire.
-- ============================================================

-- 1. Add removed_at (soft-delete marker) to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS removed_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_removed_at_idx
  ON public.profiles (removed_at) WHERE removed_at IS NOT NULL;

-- 2. FK changes — replace NO ACTION with ON DELETE SET NULL
--    so Purge (deleteUser) does not block on referencing rows.

-- audit_log.changed_by
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_changed_by_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- admin_audit_log.actor_id (make nullable first — SET NULL requires it)
ALTER TABLE public.admin_audit_log
  ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_actor_id_fkey;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- access_requests.decided_by
ALTER TABLE public.access_requests
  DROP CONSTRAINT IF EXISTS access_requests_decided_by_fkey;
ALTER TABLE public.access_requests
  ADD CONSTRAINT access_requests_decided_by_fkey
  FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- results.entered_by
ALTER TABLE public.results
  DROP CONSTRAINT IF EXISTS results_entered_by_fkey;
ALTER TABLE public.results
  ADD CONSTRAINT results_entered_by_fkey
  FOREIGN KEY (entered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- match_fees.recorded_by
ALTER TABLE public.match_fees
  DROP CONSTRAINT IF EXISTS match_fees_recorded_by_fkey;
ALTER TABLE public.match_fees
  ADD CONSTRAINT match_fees_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- lineups.created_by
ALTER TABLE public.lineups
  DROP CONSTRAINT IF EXISTS lineups_created_by_fkey;
ALTER TABLE public.lineups
  ADD CONSTRAINT lineups_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- cards.created_by
ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_created_by_fkey;
ALTER TABLE public.cards
  ADD CONSTRAINT cards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
