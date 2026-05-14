/**
 * Server/edge-only environment validation.
 *
 * Why this module only runs server-side:
 *   It validates SUPABASE_SERVICE_ROLE_KEY — a secret that Next.js strips from
 *   the browser bundle entirely. Running Zod against it in a client context
 *   would throw at runtime because the variable is undefined in the browser.
 *
 * Why client.ts intentionally does NOT import this file:
 *   createBrowserClient() is bundled for the browser. If it pulled in env.ts,
 *   Zod would execute in the browser, find SUPABASE_SERVICE_ROLE_KEY ===
 *   undefined, and throw. The NEXT_PUBLIC_* vars that client.ts needs are
 *   inlined by Next.js at build time — no validation wrapper is required.
 *
 * Files that DO import this module (all server-side):
 *   - src/lib/supabase/server.ts      (server-only, cookie-based SSR client)
 *   - src/lib/supabase/admin.ts       (server-only, service-role client)
 *   - src/lib/supabase/anon-public.ts (server component context, (public)/*)
 *   - src/app/api/health/route.ts     (Route Handler)
 */
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Optional: falls back to VERCEL_URL (set automatically by Vercel) if absent.
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  OWNER_ALLOWED_EMAIL: z.string().email(),
  GMAIL_USER: z.string().email(),
  GMAIL_APP_PASSWORD: z.string().min(10),
});

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined),
  OWNER_ALLOWED_EMAIL: process.env.OWNER_ALLOWED_EMAIL,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
};

const result = schema.safeParse(raw);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Environment validation failed. Fix the following variables in .env.local:\n${details}`,
  );
}

export const env = result.data;
