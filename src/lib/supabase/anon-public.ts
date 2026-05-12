/**
 * Used ONLY by (public)/* routes. Never import this in (app)/* code.
 * Public pages must read only from public_* Postgres views — base tables
 * are RLS-locked.
 *
 * In MVP this client is functionally equivalent to createBrowserClient(), but
 * keeping it separate means a future privilege change (e.g. a stricter anon
 * key with even fewer grants) is a one-file edit with no risk of accidentally
 * affecting the authenticated app.
 */
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createAnonPublicClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — cookie writes require middleware.
          }
        },
      },
    },
  );
}
