# Kickstart Rush

A fantasy football platform for managing fixtures, results, standings, and player dashboards. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Getting started

```bash
cp .env.example .env.local
```

This app uses a single Supabase project. Local development, Vercel previews, and
production all connect to the same database. Open `.env.local` and fill in the
values from the **kickstart-rush-prod** Supabase project dashboard.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

To verify the Supabase connection is working, visit:

```
http://localhost:3000/api/health
```

Expected response:

```json
{ "ok": true, "supabase": "reachable", "schema": "deployed" }
```

## Authentication

Sign-in uses Supabase Auth magic links. Two paths exist:

1. **Owner (bootstrap).** The first owner account is seeded with `is_approver = true` and full squad access via migration. They sign in by entering their email at `/sign-in` and clicking the one-time link they receive.

2. **Invited users.** An approver (initially the owner) invites a user from `/admin/users` and selects their role and squad access. The invitee receives a Supabase invite email containing a magic link. Clicking it creates their session; their profile is provisioned by the approver's invite action with the granted role, status, and squads.

Approvers can suspend, reactivate, remove, restore, and purge accounts from the same admin screen. Suspended or removed users with valid Supabase sessions are signed out and redirected to `/sign-in` on every authenticated page load — defence-in-depth alongside Supabase Auth bans. The check is enforced both in `src/app/(app)/layout.tsx` and in `src/lib/auth/require-approver.ts` (closing audit findings from 2026-05-15).

Sessions expire after 30 days of inactivity.

> **Note.** The `OWNER_ALLOWED_EMAIL` env var is still validated at startup but is currently inert — the `handle_new_user` trigger that consumed it was dropped in migration `20260514115715`. Cleanup of the unused var is queued as a low-priority task.

## Documentation

See the [`/docs`](./docs) folder for product overview, architecture, data model, and more.
