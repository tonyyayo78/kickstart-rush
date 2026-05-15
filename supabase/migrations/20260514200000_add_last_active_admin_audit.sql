-- Add last_active_at heartbeat column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx
  ON public.profiles (last_active_at DESC NULLS LAST);

-- Admin action audit log (separate from the data-change audit_log table)
CREATE TABLE public.admin_audit_log (
  id         bigserial    PRIMARY KEY,
  actor_id   uuid         NOT NULL REFERENCES public.profiles(id),
  action     text         NOT NULL,
  target_id  uuid,
  metadata   jsonb,
  created_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only approvers can read; writes go through service-role, no insert policy needed
CREATE POLICY admin_audit_log_approver_select
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
  );

CREATE INDEX admin_audit_log_actor_idx  ON public.admin_audit_log (actor_id,  created_at DESC);
CREATE INDEX admin_audit_log_target_idx ON public.admin_audit_log (target_id, created_at DESC);
