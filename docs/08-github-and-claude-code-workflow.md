# 08 — GitHub and Claude Code Workflow

This is how the build runs. The repo is small, the team is one person plus Claude Code, and the workflow has to keep that pair productive without skipping the practices that make the code maintainable.

## Recommended repo structure

```
kickstart-rush/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # lint + typecheck + tests on PR
│   │   └── preview-comment.yml # post Vercel preview URL on PR
│   └── pull_request_template.md
├── .vscode/
│   └── settings.json
├── docs/                       # this folder — the planning pack
├── public/                     # static assets
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── (auth)/
│   │   ├── (app)/              # authenticated app shell
│   │   │   ├── dashboard/
│   │   │   ├── fixtures/
│   │   │   ├── standings/
│   │   │   ├── players/
│   │   │   ├── reviews/
│   │   │   └── reports/
│   │   ├── api/                # route handlers if needed
│   │   └── layout.tsx
│   ├── components/             # shared UI (shadcn/ui-derived)
│   ├── features/               # feature modules — colocated server actions, schemas, components
│   │   ├── fixtures/
│   │   ├── results/
│   │   ├── standings/
│   │   ├── players/
│   │   ├── reviews/
│   │   ├── reports/
│   │   └── availability/
│   ├── lib/                    # supabase clients, auth helpers, utilities
│   ├── server/                 # server-only helpers, server actions barrels
│   └── types/                  # shared types
├── supabase/
│   ├── migrations/             # SQL migrations, ordered
│   ├── seed.sql                # seed data: squads, competitions, fixtures
│   └── config.toml             # local supabase config
├── tests/
│   ├── unit/
│   └── e2e/
├── CLAUDE.md                   # rules for Claude Code on this repo
├── README.md                   # set-up instructions
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.example                # documented env vars, no secrets
```

### Why `features/` not `lib/`
Code that belongs to a single feature lives with the feature: its server actions, its Zod schemas, its components, its tests. Shared code lives in `components/`, `lib/`, or `server/`. This keeps Claude Code's blast radius small — a change to player reviews touches `features/reviews/` and nothing else.

## Branching strategy

Trunk-based with short-lived feature branches.

- `main` — always deployable, protected.
- `feat/<short-name>` — feature work (e.g. `feat/result-entry`).
- `fix/<short-name>` — bug fixes.
- `chore/<short-name>` — tooling, deps, docs.

Rules:
- No direct commits to `main`.
- Branch from `main`, PR back to `main`.
- Squash-merge.
- Delete the branch after merge.
- Branch names are lowercase, hyphenated, under 40 chars.

## Pull request workflow

1. **Open an issue first.** Even one-line ones. Issues are how Claude Code is given a scoped task and how the manager tracks what's in flight.
2. **Branch from `main`** with a name that matches the issue (`feat/standings-tiebreakers`).
3. **Commit small.** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
4. **Open the PR early as a draft.** Vercel will publish a preview URL as soon as the first commit lands.
5. **PR description must include:**
   - Linked issue (`Closes #42`).
   - What changed and why.
   - Screenshots or screen recording for any UI change.
   - Notes for the reviewer (manual test steps, edge cases checked).
6. **CI must pass:** lint, typecheck, unit tests, build.
7. **Self-review.** Read the diff. Read it again on the preview URL on a phone.
8. **Mark ready for review.** For solo work, "review" is a deliberate re-read; for a small team, request the manager.
9. **Squash-merge.** Branch is deleted automatically.
10. **Vercel deploys to production from `main`.**

### Branch protection rules
- Require status checks: `lint`, `typecheck`, `test`, `build`.
- Require linear history.
- Disallow force-pushes to `main`.
- Require PR before merging.

## Using Claude Code safely and effectively

Claude Code is a pair, not a delegate. Treat it like a fast junior who follows directions exactly and benefits from being told the rules up front.

### Principles
1. **Plan first, code second.** For any feature larger than a small change, ask Claude Code to write a plan (file changes, schema changes, tests) and read it before allowing any edits.
2. **Tight scope per session.** One feature, one branch, one issue. Do not let a "while you're there" creep into PRs.
3. **The repo is the spec.** `CLAUDE.md`, `docs/`, types, and existing code patterns are the rules. If Claude proposes a deviation, it must justify it.
4. **Database migrations are sacred.** Never edit an existing migration; always add a new one. Never let Claude run `db:reset` against a non-local database.
5. **Read every diff.** Especially SQL, RLS policies, and anything in `lib/auth/`.

### Suggested `CLAUDE.md`

Save this at the repo root. Claude Code reads it for every session.

```markdown
# CLAUDE.md — Kickstart Rush

You are working on Kickstart Rush, a Next.js + Supabase football club operations app.
Read `docs/01-product-overview.md` and `docs/03-solution-architecture.md` before
making non-trivial changes if you have not already in this session.

## Stack
- Next.js 14 App Router, TypeScript strict.
- Supabase (Postgres, Auth, Storage). Use `@supabase/ssr` clients.
- Tailwind + shadcn/ui. Forms with React Hook Form + Zod.

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
- Do not add public-facing routes. Everything is auth-protected.
- Do not add analytics, tracking, or third-party scripts without explicit instruction.
- Do not add user-invitation self-signup. Manager creates accounts.
- Do not run `supabase db reset` against any project other than the local one.

## How to ask for help
If a task is ambiguous or you would change architecture (a new dependency, a new
route group, a new auth flow), stop and write a 5-line plan in chat before editing.
```

### Prompting approach for feature-by-feature implementation

For each feature, the manager opens a session with Claude Code using a prompt template:

```
Issue: #<number> — <title>
Goal: <one-sentence outcome>
Spec: docs/<relevant docs>, especially <section>
Acceptance criteria:
- <criterion 1>
- <criterion 2>
- <criterion 3>
Out of scope: <things you explicitly do not want changed>

Plan first. Show me:
1. Files you intend to create or change
2. Migrations you intend to add
3. Tests you intend to add
4. Any open questions

Wait for my OK before editing.
```

After the plan is approved, the work proceeds in tight loops: write tests first where practical, implement, run tests, push, open PR.

### Patterns that work
- **Small PRs.** Aim for under 400 changed lines. Anything bigger is two PRs.
- **One concept per PR.** Don't combine "add result entry" with "redesign the dashboard tile".
- **Migration + RLS + tests in the same PR** as the feature that uses them.
- **Recordings, not just screenshots, for UI flows.** A 30-second screen recording on a preview URL is worth ten paragraphs of description.

### Patterns to avoid
- Letting Claude rewrite an unrelated file "for consistency" mid-PR.
- Accepting a "this should also work" comment without verifying with a test.
- Skipping the plan step on what feels like a small change to auth or RLS.
- Committing generated SQL without reading it.

## Definition of done (per feature)

A feature is done when **all** of these are true:

- [ ] The acceptance criteria in the linked issue are met.
- [ ] Code passes `lint`, `typecheck`, `test`, `build` in CI.
- [ ] Database migrations exist and are applied; RLS policies cover the new table(s).
- [ ] Audit trigger exists for any new sensitive table.
- [ ] Server actions validate input with Zod; client never bypasses them.
- [ ] At least one Playwright E2E test covers the happy path.
- [ ] The preview URL has been opened on a phone and the screen looks right.
- [ ] Documentation (`docs/`) is updated if behaviour changed.
- [ ] PR description has screenshots or recording.
- [ ] PR is squash-merged into `main` and Vercel production deploy succeeds.
- [ ] The corresponding issue is closed.
