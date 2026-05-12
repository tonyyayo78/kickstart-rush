# Kickstart Rush

A fantasy football platform for managing fixtures, results, standings, and player dashboards. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Getting started

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values from the **kickstart-rush-dev** Supabase project dashboard.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

To verify the Supabase connection is working, visit:

```
http://localhost:3000/api/health
```

Expected response (before schema migrations are applied):

```json
{ "ok": true, "supabase": "reachable", "note": "expected: schema not deployed" }
```

After applying migrations (`supabase db push`), the response will be:

```json
{ "ok": true, "supabase": "reachable", "schema": "deployed" }
```

## Authentication

Only one email address can sign in: the value of `OWNER_ALLOWED_EMAIL` in your environment (`.env.local` locally, Vercel env vars in production). Both dev and prod are configured to `alythcott@gmail.com`.

To change the allowed email:
1. Update `OWNER_ALLOWED_EMAIL` in `.env.local` (local) and in Vercel (preview + production).
2. Run `UPDATE public.app_config SET value = 'new@email.com' WHERE key = 'owner_email';` in the Supabase SQL Editor for each project (dev and prod).

The sign-in flow uses Supabase Auth magic links. When you enter your email and click "Send magic link", a one-time link is emailed to you. Clicking it exchanges the code for a session and redirects to `/dashboard`. Sessions expire after 30 days of inactivity.

Any email that is not allow-listed is silently rejected — the sign-in page always shows the same generic message regardless of whether the email matches, to avoid leaking allow-list status.

## Documentation

See the [`/docs`](./docs) folder for product overview, architecture, data model, and more.
