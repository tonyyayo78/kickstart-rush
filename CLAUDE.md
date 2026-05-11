@AGENTS.md

# CLAUDE.md — Kickstart Rush

You are working on Kickstart Rush, a Next.js + Supabase football club operations app.
Read `docs/01-product-overview.md` and `docs/03-solution-architecture.md` before
making non-trivial changes if you have not already in this session.

## Stack
- Next.js 14+ App Router, TypeScript strict.
- Supabase (Postgres, Auth, Storage). Use `@supabase/ssr` clients.
- Tailwind + shadcn/ui. Forms with React Hook Form + Zod.

## Access model (MVP)
- One signed-in user: the owner. No coach/viewer accounts in MVP.
- Public read-only surface at `/public/*` for fixtures, results (with scorers), standings.
- Public pages query Postgres views only (`public_fixtures`, `public_results_with_scorers`, `public_standings`).
- The Supabase `anon` role has SELECT on those views and NOTHING on any base table.

## Project conventions
- Feature code lives in `src/features/<feature>/`.
- Server actions live in `src/features/<feature>/actions.ts`. Validate input with Zod.
- Database access goes through Supabase server client. Never expose service role to the client.
- All mutations of `players`, `results`, `goals`, `cards`, `player_reviews`, `notes` must
  go through server actions. Never write to these tables directly from the client.
- Use Postgres views for derived data (e.g. `competition_standings`). Do not duplicate
  business logic in TS.

## Database
- All schema changes are SQL migrations in `supabase/migrations/<timestamp>_<name>.sql`.
- Never edit a committed migration. Add a new one.
- Add RLS policies for every new table in the same migration.
- Add an audit trigger to any table that stores edits to player or match data.

## Public surface — handle with extra care
- Any migration that creates or changes a public view must list its SELECT columns
  explicitly. Never use `SELECT *` in a public view.
- Any change to `public_fixtures`, `public_results_with_scorers`, `public_standings`,
  or to the `anon` role's privileges, requires its own PR with a column allow-list
  table in the description.
- Public pages must use `src/lib/supabase/anon-public.ts` (anon key only). They must
  not import the server client or service role key.

## Tests
- Unit tests with Vitest in `tests/unit` or co-located `*.test.ts`.
- E2E tests with Playwright in `tests/e2e`. Add an E2E flow for any new user-visible feature.
- A PR is not done until tests pass locally and in CI.

## Style
- Prefer Server Components. Use `'use client'` only when interaction or local state requires it.
- No `any`. If a type is hard, ask.
- No new dependencies without explaining why and what it replaces.
- Accessibility: every interactive element has a label and visible focus state.

## Out of bounds
- Do not add self-signup or invitation flows in MVP. Single owner only.
- Do not add analytics, tracking, or third-party scripts without explicit instruction.
- Do not add additional public routes beyond `/public/fixtures`, `/public/results`,
  `/public/standings`.
- Do not run `supabase db reset` against any project other than the local one.
- Do not change `noindex` or `robots.txt` posture without explicit instruction.

## How to ask for help
If a task is ambiguous or you would change architecture (a new dependency, a new
route group, a new auth flow, anything touching public views or RLS), stop and
write a 5-line plan in chat before editing.
