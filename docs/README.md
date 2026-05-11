# Kickstart Rush — Documentation Pack

Internal operations and management web application for Kickstart Football Club. This `/docs` folder contains the complete planning baseline that the build will follow.

## What this is

A web app for the club owner to run two squads — **Kickstart Elite** (U15 Zone A) and **Kickstart Premier** (U15 Zone B) — through the BFA National Youth Tournament 2026 and beyond.

In MVP, **only the owner can sign in** and edit. A small **public read-only surface** (fixtures, results with scorers, standings) is reachable by URL with no login.

Built on Next.js, Vercel, GitHub, and Supabase. Developed with Claude Code.

## Access model at a glance

| Audience | How they access | What they see |
|----------|-----------------|---------------|
| Owner | Magic-link sign-in | Full app: fixtures, results, players, reviews, reports, availability, notes, audit, exports |
| Anyone with the URL | `/public/*` pages, no login | Fixtures (date, opponent, venue), results (score + scorers), standings — and nothing else |

Public pages are `noindex` for now; indexing is a Phase 2 decision.

## How to use this pack

| Document | Purpose |
|----------|---------|
| `01-product-overview.md` | Why we are building it, who uses it, what success looks like |
| `02-mvp-scope.md` | What ships in MVP (private + public surfaces), MoSCoW |
| `03-solution-architecture.md` | Stack, environments, public/private route split |
| `04-data-model.md` | Tables, fields, public views, standings logic |
| `05-user-roles-and-permissions.md` | Owner vs anonymous public visitor; youth data safeguards |
| `06-application-modules.md` | Every module — public site included |
| `07-user-flows.md` | Step-by-step flows with Mermaid diagrams |
| `08-github-and-claude-code-workflow.md` | Repo layout, branching, Claude Code rules, DoD |
| `09-project-plan.md` | Epics (including Epic J — public site), 30/60/90-day milestones |
| `10-non-functional-requirements.md` | Security, performance, accessibility, privacy |
| `11-testing-strategy.md` | Test strategy, UAT, public/private boundary tests |
| `12-deployment-and-operations.md` | Vercel pipeline, indexing posture, backups |
| `13-future-enhancements.md` | Post-MVP ideas and integrations |

## Recommended reading order

**For the owner (1 hour read):**
1. `01-product-overview.md`
2. `02-mvp-scope.md`
3. `05-user-roles-and-permissions.md` — especially the public-surface boundary
4. `06-application-modules.md`
5. `09-project-plan.md`
6. `13-future-enhancements.md`

**For a developer or Claude Code session (start here):**
1. `01-product-overview.md`
2. `03-solution-architecture.md` — note the `(public)` vs `(app)` route groups
3. `04-data-model.md` — note the three public views and the anon role's privileges
4. `06-application-modules.md`
5. `08-github-and-claude-code-workflow.md`
6. `11-testing-strategy.md`
7. `12-deployment-and-operations.md`

**For UAT and sign-off:**
1. `02-mvp-scope.md`
2. `07-user-flows.md`
3. `11-testing-strategy.md` — including the public-surface assertions

## Conventions

- All dates use ISO 8601 (`YYYY-MM-DD`).
- All times stored in UTC; rendered in `America/Barbados`.
- Squad codes: `ELITE`, `PREMIER`.
- Documents are living. When the build deviates, update the doc in the same PR.
