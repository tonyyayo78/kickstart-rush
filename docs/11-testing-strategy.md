# 11 — Testing Strategy

Testing is scaled to the project: enough to catch the failures that would actually hurt — wrong standings, lost results, broken auth — without ceremony for its own sake.

## Test strategy by layer

### Database
- **What is tested:** RLS policies, audit triggers, the `competition_standings` view, check constraints.
- **How:** SQL test scripts that connect as a fake user (per role) and assert what they can / cannot read and write. Tie-breaker scenarios for the standings view as parameterised cases.
- **Where:** `supabase/tests/` run via Supabase CLI.
- **Trigger:** local pre-commit (optional) and CI on every PR.

### Unit
- **What is tested:** Zod schemas, pure helpers (formatters, date utilities, tie-breaker logic if any lives in TS), permission helpers.
- **How:** Vitest, fast.
- **Where:** Co-located `*.test.ts` next to the file under test, or `tests/unit/` for shared helpers.
- **Trigger:** local pre-commit and CI.

### Integration (server actions)
- **What is tested:** Each server action against a real (test) Supabase, with seeded data, asserting both DB state and returned values.
- **How:** Vitest with a Supabase test project, transactional rollback per test where possible.
- **Where:** `tests/integration/`.
- **Trigger:** CI.

### End-to-end
- **What is tested:** The five core user flows from `07-user-flows.md` plus auth.
- **How:** Playwright, headless in CI, headed locally for debugging.
- **Where:** `tests/e2e/`.
- **Trigger:** CI on PR; nightly against the latest preview.

### Manual / exploratory
- **What is tested:** Anything new, on a real phone, against a preview URL.
- **How:** the manager opens the preview link from a phone and walks the change.
- **Trigger:** every PR before merge.

## Manual UAT checklist

This is the run-through the manager performs before sign-off. Each check has a clear pass/fail.

### Auth
- [ ] Sign in via magic link as Manager.
- [ ] Manager invites a Coach by email; coach receives email; coach signs in.
- [ ] Manager changes a Coach's role to Viewer; coach loses edit options on next page load.
- [ ] Manager revokes a session; that user is signed out within 60 seconds.

### Squads and players
- [ ] Both squads visible from the squad list.
- [ ] Add a new player to Elite; required fields enforced; DOB outside U15 window is rejected.
- [ ] Edit a player; change reflected immediately.
- [ ] Soft-delete a player (Manager); player is hidden from squad list; visible in deleted list; restorable.

### Fixtures
- [ ] Both Zone A and Zone B fixtures pre-seeded; counts correct (28 per zone group stage).
- [ ] Filter fixtures by squad; only that squad's fixtures show.
- [ ] Edit kick-off / venue; change saved; audit entry recorded.
- [ ] Add a friendly fixture; appears in fixture list.

### Result entry
- [ ] Enter result for the Sat 9 May fixture; standings update on Standings page.
- [ ] Add scorers and cards; player profiles reflect goals and minutes.
- [ ] Try to enter a duplicate result; system asks to edit instead.
- [ ] Manager edits an existing result; audit log shows before/after.

### Standings
- [ ] Two-zone view available.
- [ ] Order matches manual calculation for a known sample.
- [ ] Tie-breaker explanation visible (Pts → GD → GF → H2H).
- [ ] Form column shows last five W/D/L correctly.
- [ ] Export CSV; downloaded file matches on-screen table.

### Player progression
- [ ] New review form on a player; sliders 1–5; required text fields.
- [ ] Save review; immutable on save (no edit button, only "correct").
- [ ] Correct review; new entry appears; old entry preserved with reason.
- [ ] Trend chart shows new period.
- [ ] Reviews-due list decrements after submission.

### Match reports
- [ ] Draft a report; saved as draft; not visible to Viewer.
- [ ] Publish report; visible to Viewer (without coach private notes).
- [ ] MOTM badge appears on player profile.

### Availability
- [ ] Matchday squad screen for next fixture.
- [ ] Mark each player; counts update.
- [ ] Bulk-mark "unavailable" for a multi-select; works.
- [ ] Coach (Phase 2 scoping) cannot edit other squad's availability — N/A in MVP.

### Mobile
- [ ] Result entry on iOS Safari at 360 px; form is usable; numeric keyboards appear.
- [ ] Matchday squad on Android Chrome; one tap per player; no horizontal scroll.

### Reliability
- [ ] Daily backup verified (Supabase dashboard shows last successful run).
- [ ] Restoration drill performed in dev.

## Sample acceptance criteria

These are the form Claude Code is given as part of the issue prompt for each story.

### Story: Enter a match result
**As** a coach
**I want** to enter the final score, scorers, and cards for a played fixture
**So that** the standings and player profiles update automatically.

**Acceptance criteria:**
- Given a fixture in `scheduled` status, when I open the result entry form, I can enter home and away scores.
- I can add 0–N scorers, each with a player from my squad and a minute.
- I can flag a goal as own-goal or penalty.
- I can add 0–N cards (yellow / red / second yellow), with a player and minute.
- On save, a row exists in `results`, the fixture status becomes `played`, and an `audit_log` entry exists for this user.
- Re-opening the form shows the saved values.
- Attempting to save a duplicate result triggers an "edit existing?" prompt.
- A coach without edit rights sees the form read-only.
- The form is usable on a 360 px viewport.

### Story: Standings calculate from results
**As** a manager
**I want** the standings table to reflect entered results without manual maintenance
**So that** I always trust the position.

**Acceptance criteria:**
- Given a competition with eight teams and several entered results, the standings page shows P, W, D, L, GF, GA, GD, Pts for each team.
- Order is by Pts desc, then GD desc, then GF desc, then head-to-head, then alphabetical.
- The form column shows the last five W/D/L for each team.
- Adding or editing a result causes the next standings page load to reflect the change.
- Exporting CSV produces the same data as the on-screen table, in the same order.

### Story: Complete a player review
**As** a coach
**I want** to record a structured monthly review for a player
**So that** their progression is visible over time.

**Acceptance criteria:**
- The new review form has 1–5 sliders for technical, tactical, physical, attitude.
- Three required text areas: strengths, to improve, next focus.
- On save, the review is immutable.
- "Correct" creates a new review for the same `review_period` and requires a reason.
- The player profile's reviews tab shows a trend chart with all four dimensions over time.
- The reviews-due list does not show the player for the current month after submission.

## Priority test scenarios

### Standings
1. Three teams tied on points; goal difference resolves order.
2. Two teams tied on points and goal difference; goals for resolves order.
3. Two teams tied on Pts/GD/GF; head-to-head resolves order.
4. A team has played zero matches; appears at bottom alphabetically with all zeros.
5. A draw correctly increments D for both teams.
6. An own goal counts for the opposing team.
7. Adding a result mid-season correctly updates form (last five) order.

### Results entry
1. Saving with empty scores fails validation with a clear message.
2. Saving with a scorer count exceeding the score is allowed (penalties / dispute scenarios) but warned.
3. A card on a player flagged as `inactive` shows a warning but can be saved (covers historical edits).
4. Editing a result writes to the audit log with before and after values.
5. Two coaches editing the same result simultaneously — last write wins, audit captures both.

### Player tracking
1. A player with zero reviews shows an empty reviews tab with a "Start review" CTA.
2. A player with a corrected review shows the latest version in the chart and both versions in history.
3. A player's match list reflects only matches in which they appeared (started or sub).
4. Soft-deleted player is hidden from main lists but accessible to Manager from "Deleted players".
5. A note marked private is visible to author and Manager only — verified at the database via RLS test.

## Public surface tests (added)

These tests assert the public/private boundary is intact. Failing any of these is a P0 incident.

1. With **no session**, GET `/public/fixtures` returns 200 and shows fixtures.
2. With no session, GET `/public/results` shows only score + scorers (display_name + minute), no cards, no half-time, no MOTM.
3. With no session, GET `/public/standings` returns 200 and shows the full table.
4. With no session, GET `/dashboard` returns 302 to `/sign-in`.
5. With no session, GET `/players/<id>` returns 302 to `/sign-in`.
6. Response headers from `/public/*` include `X-Robots-Tag: noindex, nofollow`.
7. `robots.txt` disallows `/public/`.
8. SQL test: connecting to Supabase as the `anon` role, `SELECT` from `players`, `results`, `goals`, `cards`, `match_reports`, `player_reviews`, `notes`, `availabilities`, `audit_log`, `profiles`, `fixtures` all return permission-denied errors.
9. SQL test: connecting as `anon`, `SELECT` from each of the three public views returns rows.

## CI configuration (summary)

GitHub Actions workflow runs on every PR:

```yaml
name: ci
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Test data and environments

- **Unit and integration:** isolated test Supabase project (or local Supabase via Docker for fastest feedback).
- **E2E:** runs against the preview deploy URL with a dedicated test user, seeded data reset before each run.
- **Production:** never targeted by automated tests other than synthetic smoke checks (Phase 2).
