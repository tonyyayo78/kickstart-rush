/**
 * Bypasses RLS. Use ONLY for system operations like the auth
 * handle_new_user trigger context. Never import from a route handler
 * that's reachable by anon users.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
