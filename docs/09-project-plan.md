# 09 — Project Plan

A 90-day plan from kick-off to a stable post-qualifier release. With single-owner access and a small public site, the user-management work that would otherwise sit in early epics moves to Phase 2 — that time is reinvested in the public surface and polish.

## Epics and stories

### Epic A — Project foundations
| ID | Story | Notes |
|----|-------|-------|
| A1 | Initialise Next.js + TS + Tailwind + shadcn/ui repo | Strict TS, ESLint, Prettier |
| A2 | Set up Supabase project (dev + prod) | Two projects, env vars wired |
| A3 | Set up Vercel project, link to GitHub | Preview deploys verified |
| A4 | Add `CLAUDE.md`, PR template, branch protection | Workflow guardrails live |
| A5 | Migrations folder + first migration (squads, profiles) | Migrations workflow proven end-to-end |
| A6 | Establish `(public)` and `(app)` route groups in Next.js | With placeholder pages |

### Epic B — Owner authentication
| ID | Story | Notes |
|----|-------|-------|
| B1 | Email magic-link sign-in | Supabase Auth |
| B2 | `profiles` table with role enum (owner-only in MVP) | Auto-create profile on first sign-in |
| B3 | Allow-list owner email at the application layer | Reject sign-in attempts from other addresses |
| B4 | Auth guard on `(app)` routes | Redirect to sign-in |
| B5 | RLS policies for `profiles`, `squads` | Tested |

### Epic C — Squads, players, fixtures (data backbone)
| ID | Story | Notes |
|----|-------|-------|
| C1 | `squads` and `players` tables + RLS + audit | Soft-delete column |
| C2 | Seed Kickstart Elite and Kickstart Premier | |
| C3 | `competitions` and `competition_teams` tables | `is_public` column on competitions |
| C4 | `fixtures` table + RLS + audit | Status enum |
| C5 | Seed all 56 group-stage fixtures | From BFA fixture sheets |
| C6 | Squad list and player CRUD UI | Mobile-first |
| C7 | Fixture list and fixture detail UI (private) | Filter by squad / month |

### Epic D — Results and standings
| ID | Story | Notes |
|----|-------|-------|
| D1 | `results`, `goals`, `cards` tables + audit | Triggers populate `scorer_label` |
| D2 | Result entry form (mobile-first) | Validation, scorers, cards |
| D3 | `competition_standings` view | Tie-breakers in SQL |
| D4 | Standings page (private) with form column | Two-tab layout (Zone A / B) |
| D5 | `player_match_stats` populated by trigger | Used by player profile |
| D6 | E2E: enter result, standings update | Playwright |

### Epic E — Player progression
| ID | Story | Notes |
|----|-------|-------|
| E1 | `player_reviews` table + audit | Immutable on save |
| E2 | New review form | 4 sliders, 3 text areas |
| E3 | Reviews due list | |
| E4 | Player profile Reviews tab with trend chart | Recharts |
| E5 | Player profile Matches tab | From `player_match_stats` |
| E6 | Player profile Notes tab | Add note inline |

### Epic F — Match reports and availability
| ID | Story | Notes |
|----|-------|-------|
| F1 | `match_reports` table + RLS (owner-only) | Draft / published flag retained for Phase 3 |
| F2 | Match report editor | Linked from result entry |
| F3 | `availabilities` table + RLS | Five statuses |
| F4 | Matchday squad screen | One screen, one tap |
| F5 | Availability bulk-edit | Select multiple |

### Epic G — Dashboard and exports
| ID | Story | Notes |
|----|-------|-------|
| G1 | Dashboard tiles (next fixture, last result, standings, reviews due, availability) | |
| G2 | CSV exports (owner only) for fixtures, results, players, standings | Server action |
| G3 | Quick-add menu | Mobile FAB |

### Epic H — Hardening and ops
| ID | Story | Notes |
|----|-------|-------|
| H1 | Daily Supabase backup verified | Restoration drill |
| H2 | Sentry wired up | Error grouping |
| H3 | Audit log viewer for owner | Filter by table / row |
| H4 | Mobile responsive pass on every screen | Touch targets, contrast |
| H5 | Accessibility pass | Keyboard, labels, focus |

### Epic J — Public site (new)
| ID | Story | Notes |
|----|-------|-------|
| J1 | `public_fixtures`, `public_results_with_scorers`, `public_standings` views | Explicit column lists |
| J2 | Postgres privileges: `anon` SELECT on views only | Defence in depth |
| J3 | RLS sanity tests for the anon role | Cannot read base tables |
| J4 | `(public)/fixtures` page | Mobile-first, no nav into private app |
| J5 | `(public)/results` page with scorers list | Per-fixture expandable |
| J6 | `(public)/standings` page | Two-zone toggle, form column |
| J7 | `noindex,nofollow` meta on all public pages | Verified in DOM and HTTP headers |
| J8 | `robots.txt` disallowing `/public/*` | Verified at deploy |
| J9 | `players.display_name` column + generation logic | Default "F. Lastname" |
| J10 | Owner-controlled `competitions.is_public` toggle | UI in private competition settings |
| J11 | E2E: anon visitor sees public surface, never private data | Playwright with no session |

### Epic I — Phase 2 (after qualifiers)
| ID | Story | Notes |
|----|-------|-------|
| I1 | Coach and Viewer roles, invitation flow, user management screen | |
| I2 | Microsoft Entra ID SSO | OIDC via Supabase |
| I3 | Per-squad coach scoping | `assigned_squad_id` enforcement |
| I4 | Training session module | Schedule + attendance |
| I5 | Knockout / Super 8 / Plate bracket view | New competition entries |
| I6 | Email digest of upcoming fixtures and reviews due | Supabase scheduled function |
| I7 | Public-site review: indexing decision, leading-scorers, curated reports | |

## Suggested sequence of implementation

The order is chosen so that a working slice exists at the end of every two-week chunk.

1. **Foundations and auth (Week 1).** Epic A, then B1–B5. Sign-in works for the owner, app shell exists, public route group scaffolded.
2. **Data backbone (Week 2).** Epic C. Squads, players, fixtures all visible.
3. **Results and standings (Week 3).** Epic D. The first real-world fixture (Sat 9 May 2026) can be entered and the table updates.
4. **Player progression (Week 4).** Epic E and the start of F. Reviews can be done, profiles render.
5. **Public site (Week 5).** Epic J. Public fixtures/results/standings live with `noindex` and explicit views. The first thing parents and players can be pointed to.
6. **Reports, availability, dashboard (Week 6).** Rest of F, then G. The app is usable end-to-end.
7. **Hardening (Weeks 7–8).** Epic H.
8. **Phase 2 (Weeks 9–12).** Epic I.

The public site is deliberately scheduled in Week 5 — after results and standings are stable but before hardening. That way it ships as soon as the underlying data is real, rather than as a polish task at the end.

## Milestones

### 30-day plan — "MVP candidate ready for first match"
By the end of week 4:
- Foundations, owner auth, squads, players, fixtures, results, standings, reviews, availability working.
- Both squads' qualifier fixtures seeded.
- Daily backup running.
- Sat 9 May 2026 fixtures entered as the first real-world test.
- Public route group scaffolded with placeholder pages.

**Exit criteria:**
- All MoSCoW Must items (excluding public site) merged to `main`.
- Production URL live.
- One full result-to-standings cycle done by the owner on a phone.

### 60-day plan — "Stable through qualifiers"
By the end of week 8:
- Public site live with fixtures, results (with scorers), standings.
- Match reports, availability, dashboard polished.
- Audit log viewer in place.
- Accessibility and responsive passes complete.
- All qualifier results entered; standings match BFA's; public surface verified to expose no private data.
- CSV exports verified.
- Sentry catching real errors; no priority-1 incidents in the last two weeks.

**Exit criteria:**
- All MoSCoW Must and Should items merged.
- Backup restoration tested in dev.
- UAT checklist (`11-testing-strategy.md`) signed off, including the public/private boundary tests.

### 90-day plan — "Phase 2 underway"
By the end of week 12:
- Coach/Viewer roles and Entra ID SSO available.
- Per-squad coach scoping live.
- Knockout / Super 8 / Plate competitions modelled.
- First training session module increment shipped.
- Public-site review: indexing decision recorded; leading-scorers and curated public reports prioritised or deferred.

**Exit criteria:**
- The app is the system of record for the club.
- Roadmap for next season agreed.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Public surface accidentally exposes private data | Low | High | Public pages query views only; `anon` has no privileges on base tables; E2E test with no session asserts both presence and absence |
| `display_name` defaults reveal more than intended | Medium | Medium | Default is "F. Lastname"; per-player override; owner can globally switch to initials at any time |
| Public page indexed despite `noindex` | Low | Medium | `robots.txt` + meta tag + HTTP `X-Robots-Tag` header all set; deploy check verifies |
| Schema change halfway through qualifiers breaks results entry | Medium | High | Migration tests in CI; backups verified; preview URL exercised before merge |
| RLS policy bug widens access | Low | High | RLS-specific tests in `tests/unit`; review every policy in PR; default-deny posture |
| Owner can't enter a result on phone (network at venue) | Medium | Medium | Form draft kept in `localStorage`; entry can complete after the match |
| Standings calculation differs from BFA's | Low | Medium | View documented; tie-breakers cross-checked against BFA rules; exportable for comparison |
| Manager too busy to maintain `CLAUDE.md` | High | Medium | Doc updates part of definition-of-done; small, frequent edits |
| Claude Code makes a non-trivial wrong change to RLS or public views | Medium | High | Plan-first prompting; small PRs; **mandatory** code review on any change touching `(public)/`, public views, or RLS |
| Supabase free-tier limits hit late in season | Low | Medium | Monitor monthly; upgrade is one click |
| Photo upload fails on poor mobile signal | Medium | Low | Photos optional; allow add-later |

## Dependencies and assumptions

### External
- BFA fixture sheets remain stable.
- Internet connectivity available for at least one day per week to enter results.
- Office 365 tenancy remains active for Phase 2 Entra ID work.

### Technical
- Vercel free tier sufficient for a single-club app.
- Supabase free tier sufficient for MVP database, auth, and three public views.
- GitHub free tier sufficient for a private repo with CI.

### Assumptions
- One person (the owner, with Claude Code) has 8–12 hours per week of build time during MVP.
- The owner is available for 1–2 hours per week of UAT.
- No data migration from a prior system.
- Roster sizes per squad are small enough (<30) that manual entry is acceptable.
- The qualifying tournament won't be cancelled or significantly rescheduled.
- Players' parents/guardians are comfortable with scorer's display name appearing publicly. (If not, switching `display_name` to initials globally is a one-line change.)
