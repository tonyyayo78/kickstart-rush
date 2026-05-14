-- The handle_new_user trigger raised 'Email not authorised' for any non-owner
-- email, blocking inviteUserByEmail from creating approved users. Profile
-- creation is handled explicitly in the approve server action.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
