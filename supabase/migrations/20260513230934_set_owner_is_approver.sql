-- The approver queue page is gated on profiles.is_approver = true.
-- The single existing profile is the owner and should be the approver.
UPDATE public.profiles SET is_approver = true WHERE is_approver = false;
