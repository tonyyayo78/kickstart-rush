# Production Health Audit — Kickstart Rush
**Date:** 2026-05-15  
**Branch audited:** main  
**Method:** Static analysis only — no code changes, no DB writes, no test users  
**Auditor:** Claude Sonnet 4.6  

---

## Executive Summary

32 findings across five areas. No Critical findings. Two High-severity gaps in the auth model (no Next.js middleware registered; `profile.status` never checked in the app shell) mean a pending or denied user with a live Supabase session can reach every authenticated route and submit every server action. Data is protected by RLS, but the page-level gating assumption is broken. The rest of the findings are Medium or below.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 8 |
| Low | 14 |
| Informational | 8 |
| **Total** | **32** |

---

## Area 1 — Security & Data Scoping

### Finding 1 — No middleware.ts; auth protection is layout-only
**Area:** 2  
**Severity:** High  
**Surface:** project root / `src/proxy.ts`  
**Verbatim evidence:**
```
$ ls src/middleware.ts
ls: src/middleware.ts: No such file or directory

.next/server/middleware/middleware-manifest.json:
{"sorted_middleware":[],"middleware":{},"instrumentation":null,"functions":{}}

src/app/(app)/layout.tsx:17:
  if (!user) redirect("/sign-in");
```
`src/proxy.ts` contains a complete `proxy()` function with auth logic and a `config.matcher` export, but it is never imported or referenced anywhere. It is not at the path Next.js looks for (`src/middleware.ts` or `middleware.ts`). The middleware manifest confirms no middleware is registered. Every `(app)` route is protected only by the redirect in the layout server component — API routes and direct fetch calls to `(app)` server actions bypass this check entirely.

---

### Finding 2 — profile.status not checked; pending/denied users can reach every (app) page
**Area:** 2  
**Severity:** High  
**Surface:** `src/app/(app)/layout.tsx`  
**Verbatim evidence:**
```tsx
const { data: profile } = await supabase
  .from("profiles")
  .select("email, display_name, is_approver, must_change_password")
  .eq("id", user.id)
  .single();
```
`profiles.status` (values: `'pending'`, `'active'`, `'denied'`) is not in the SELECT list and is never checked. A user whose request was denied but whose Supabase auth session is still valid (tokens not expired, not Supabase-banned) can reach all authenticated pages and submit all server actions. RLS via `user_accessible_squads()` does filter on `status = 'active'`, so they see no data rows, but the pages render and actions return silently — no redirect or error.

---

### Finding 3 — saveLineup action has no auth guard
**Area:** 2  
**Severity:** Medium  
**Surface:** `src/features/lineup/actions.ts`  
**Verbatim evidence:**
```tsx
export async function saveLineup(
  input: SaveLineupInput
): Promise<{ error: string } | { success: true }> {
  const parsed = SaveLineupSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };
  const { fixtureId, formation, players } = parsed.data;
  const supabase = await createServerClient();
  // No auth.getUser() call, no redirect
```
Every other server action in the codebase (`fees/`, `results/`, `live-match/`, `players/`) calls `getUser()` and redirects or returns an error when unauthenticated. `saveLineup` skips this — it relies on RLS to silently reject the write. The write fails safely, but the pattern is inconsistent and a future RLS misconfiguration would allow unauthenticated lineup writes.

---

### Finding 4 — createResult/updateResult scorer-count check bypassed via client-supplied team IDs
**Area:** 1  
**Severity:** Medium  
**Surface:** `src/features/results/actions.ts`  
**Verbatim evidence:**
```tsx
const homeScorers = scorers
  .filter((s) => s.competitionTeamId === homeTeamId).length;
const awayScorers = scorers
  .filter((s) => s.competitionTeamId === awayTeamId).length;
if (homeScorers > homeScore) {
  return { error: `Too many home scorers...` };
}
```
`homeTeamId` and `awayTeamId` come from the client, not from a server-side fixture lookup. A caller who passes `homeTeamId === awayTeamId` makes all scorers count as the same side, defeating the count invariant check. The `goals_validate_team` DB trigger still catches invalid `competition_team_id` values, but the per-side count guard is defeated before any data is written.

---

### Finding 5 — lineup_players RLS does not prevent cross-squad player insertion
**Area:** 1  
**Severity:** Medium  
**Surface:** `supabase/migrations/20260513010000_user_model_phase_b.sql`  
**Verbatim evidence:**
```sql
CREATE POLICY lineup_players_active_squad
  ON public.lineup_players FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lineups l
      JOIN public.fixtures f ON f.id = l.fixture_id
      JOIN public.competition_teams ht ON ht.id = f.home_team_id
      JOIN public.competition_teams at ON at.id = f.away_team_id
      WHERE l.id = lineup_id
      AND (ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
           OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads()))
    )
  );
```
The policy verifies the fixture belongs to an accessible squad, but does not verify that the `player_id` belongs to that same squad. A KP2026 coach who obtains a KE2026 player UUID (for example, from a cached response or URL inspection) can insert that player into a KP2026 lineup.

---

### Finding 6 — fixtures RLS exposes all competition fixtures across squads
**Area:** 1  
**Severity:** Informational  
**Surface:** `supabase/migrations/20260513040000_fixtures_competition_scope.sql`  
**Verbatim evidence:**
```sql
CREATE POLICY fixtures_active_squad ON public.fixtures FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_teams ct
      WHERE (ct.id = home_team_id OR ct.id = away_team_id)
      AND ct.competition_id IN (
        SELECT DISTINCT ct2.competition_id
        FROM public.competition_teams ct2
        WHERE ct2.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
      )
    )
  );
```
A KP2026 coach can read all fixtures in any competition where KP2026 participates — including KE2026 vs third-party fixtures. This is likely intentional (league-wide visibility), but means KE2026-specific fixture metadata (venue, match state, live tracking) is visible to KP2026 coaches. No comments in the migration document the intent.

---

### Finding 7 — anon role granted SELECT on access_requests and access_request_teams
**Area:** 1  
**Severity:** Low  
**Surface:** `supabase/migrations/20260513223530_grant_anon_select_access_requests.sql`  
**Verbatim evidence:**
```sql
GRANT SELECT ON public.access_requests      TO anon;
GRANT SELECT ON public.access_request_teams TO anon;
```
No RLS SELECT policy exists for the `anon` role on either table, so the grant is currently inert (RLS blocks queries). However, if a permissive anon policy is ever added, anon callers would immediately be able to read pending requests including applicant email addresses and squad preferences.

---

### Finding 8 — squads anon SELECT policy uses USING(true)
**Area:** 1  
**Severity:** Informational  
**Surface:** `supabase/migrations/20260513080000_squads_anon_select.sql`  
**Verbatim evidence:**
```sql
CREATE POLICY squads_anon_select
  ON public.squads FOR SELECT TO anon
  USING (true);
```
The full `squads` table (id, code, name, age_group, season, created_at) is queryable by unauthenticated callers, not just the columns exposed through public views. Squad UUIDs being public allows any caller to enumerate squad IDs for use in direct table queries (subject to other RLS).

---

## Area 2 — Auth & Access Control

*(Findings 1, 2, 3 appear above under Security; additional auth findings below.)*

### Finding 9 — inviteUserByEmail flow never sets must_change_password
**Area:** 2  
**Severity:** Informational  
**Surface:** `src/app/(app)/admin/users/actions.ts:45–62`  
**Verbatim evidence:**
```tsx
await admin.from("profiles").insert({
  id: newUserId,
  email: req.email,
  first_name: req.first_name ?? null,
  display_name: displayName,
  role: req.role,
  status: "active",
  is_approver: false,
  // must_change_password not set — defaults to false
});
```
The old temp-password flow (now dead code in `approver-actions.ts`) set `must_change_password: true` to force a password change on first login. The Supabase invite link flow handles password setup natively via magic link, so the flag isn't needed there. Architecturally consistent, but the two approval paths behave differently. If the invite email fails to deliver, the user has no password and `must_change_password` is false — they are stuck.

---

### Finding 10 — Suspended user heartbeat updates via admin client in layout
**Area:** 2  
**Severity:** Informational  
**Surface:** `src/app/(app)/layout.tsx:24–31`  
**Verbatim evidence:**
```tsx
await createAdminClient()
  .from("profiles")
  .update({ last_active_at: now })
  .eq("id", user.id)
  .or(`last_active_at.is.null,last_active_at.lt.${sixtySecondsAgo}`);
```
Admin client bypasses RLS. Supabase-banned users cannot sign in, so in practice this code path is unreachable for suspended users. However, `profile.status` is not checked (Finding 2), so a user with status `'denied'` who still has a valid token will update their heartbeat on every page load.

---

## Area 3 — Data Integrity

### Finding 11 — ON DELETE CASCADE on results → fixtures silently deletes results
**Area:** 3  
**Severity:** Medium  
**Surface:** `supabase/migrations/20260512130000_results_and_standings.sql`  
**Verbatim evidence:**
```sql
CREATE TABLE public.results (
  fixture_id   uuid  UNIQUE NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  ...
);
-- goals also:
CREATE TABLE public.goals (
  result_id  uuid  NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  ...
);
```
Deleting a fixture cascades to its result and then to all goals. There is no soft-delete on fixtures, no confirmation guard in the fixtures delete action beyond Zod validation of the fixture ID. A misfire on the fixtures delete action permanently erases match result history.

---

### Finding 12 — goals table missing updated_at
**Area:** 3  
**Severity:** Low  
**Surface:** `supabase/migrations/20260512130000_results_and_standings.sql`  
**Verbatim evidence:**
```sql
CREATE TABLE public.goals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id           uuid        NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  competition_team_id uuid        NOT NULL REFERENCES public.competition_teams(id),
  player_id           uuid        REFERENCES public.players(id) ON DELETE SET NULL,
  minute              int         CHECK (minute >= 1 AND minute <= 130),
  is_own_goal         boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
```
Goals can be edited via `updateGoal` in the live-match actions, but no `updated_at` column tracks when a goal record last changed.

---

### Finding 13 — lineup_players table missing created_at and updated_at
**Area:** 3  
**Severity:** Low  
**Surface:** `supabase/migrations/20260512180000_lineups.sql`  
**Verbatim evidence:**
```sql
CREATE TABLE public.lineup_players (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  lineup_id       uuid  NOT NULL REFERENCES public.lineups(id) ON DELETE CASCADE,
  player_id       uuid  NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  role            text  NOT NULL CHECK (role IN ('starter', 'sub')),
  position_label  text,
  slot_order      int   NOT NULL CHECK (slot_order BETWEEN 1 AND 11),
  UNIQUE (lineup_id, player_id),
  UNIQUE (lineup_id, role, slot_order)
);
```
No timestamp columns.

---

### Finding 14 — access_request_teams table missing all timestamp columns
**Area:** 3  
**Severity:** Low  
**Surface:** `supabase/migrations/20260513000000_user_model_phase_a.sql`  
**Verbatim evidence:**
```sql
CREATE TABLE public.access_request_teams (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid  NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
  squad_id    uuid  NOT NULL REFERENCES public.squads(id)          ON DELETE CASCADE,
  UNIQUE (request_id, squad_id)
);
```
No `created_at` or `updated_at`.

---

### Finding 15 — access_requests table missing updated_at
**Area:** 3  
**Severity:** Low  
**Surface:** `supabase/migrations/20260513000000_user_model_phase_a.sql`  
**Verbatim evidence:**
```sql
CREATE TABLE public.access_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        NOT NULL,
  first_name   text        NOT NULL,
  last_name    text        NOT NULL,
  role         text        NOT NULL CHECK (role IN ('Coach', 'Manager', 'Technical Director')),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at   timestamptz,
  decided_by   uuid        REFERENCES public.profiles(id),
  notes        text
);
```
No `updated_at` column; no `set_updated_at` trigger.

---

### Finding 16 — profiles table missing updated_at
**Area:** 3  
**Severity:** Low  
**Surface:** `supabase/migrations/20260511000000_init_profiles_squads.sql` and subsequent migrations  
**Verbatim evidence:**
```sql
CREATE TABLE public.profiles (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text        NOT NULL,
  display_name      text,
  role              public.profiles_role NOT NULL DEFAULT 'owner',
  assigned_squad_id uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```
Subsequent migrations add `first_name`, `status`, `is_approver`, `must_change_password`, `last_active_at`, `removed_at` — but none add `updated_at`.

---

### Finding 17 — admin_audit_log.actor_id nullable; purged actor's history is unattributed
**Area:** 3  
**Severity:** Low  
**Surface:** `supabase/migrations/20260514210000_admin_user_management.sql`  
**Verbatim evidence:**
```sql
ALTER TABLE public.admin_audit_log
  ALTER COLUMN actor_id DROP NOT NULL;
```
Required to support `ON DELETE SET NULL` on the FK to `profiles`. When an approver account is hard-deleted (purged), all their `admin_audit_log` rows become `actor_id = NULL`. There is no `actor_email` snapshot column, so prior admin actions become permanently unattributable.

---

### Finding 18 — profiles table has no audit trigger
**Area:** 5  
**Severity:** Medium  
**Surface:** all migrations  
**Verbatim evidence:**
```
$ grep -rn "audit_row_change\|audit_trigger" supabase/migrations/ | grep profiles
(no results)
```
CLAUDE.md states: "Add an audit trigger to any table that stores edits to player or match data." Profile mutations (`status`, `is_approver`, `must_change_password`, `removed_at`) go through the admin client and are logged in `admin_audit_log`, but direct RLS-permitted self-updates (e.g., the `setPassword` action changing `must_change_password`) write to `profiles` with no audit trail.

---

### Finding 19 — competitions and competition_teams tables lack audit triggers
**Area:** 5  
**Severity:** Low  
**Surface:** `supabase/migrations/20260512000000_competitions_fixtures_players.sql`  
**Verbatim evidence:**
```
$ grep -n "audit_row_change\|audit_trigger" supabase/migrations/20260512000000_competitions_fixtures_players.sql
(no results)
```
Changes to competition structure (adding/removing squads from competitions, competition name changes) are not tracked in the audit log.

---

### Finding 20 — lineups RLS had a gap window between phase A and phase B migrations
**Area:** 3  
**Severity:** Informational  
**Surface:** `supabase/migrations/20260512180000_lineups.sql` → `20260513010000_user_model_phase_b.sql`  
**Verbatim evidence:**
```sql
-- 20260512180000: initial policy
CREATE POLICY lineups_owner_all ON public.lineups
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  ));

-- 20260513010000: profiles.role column dropped here, then:
CREATE POLICY lineups_active_squad ON public.lineups ...
```
Between these two migrations there was a window where lineups were inaccessible to all authenticated users (the `role` column was dropped but the replacement policy not yet in place). Resolved in production, but documents a schema gap that could recur in future multi-step migrations.

---

## Area 4 — Code Health

### Finding 21 — Dead route: /admin/access-requests linked from dashboard
**Area:** 4  
**Severity:** Medium  
**Surface:** `src/app/(app)/dashboard/page.tsx:64`  
**Verbatim evidence:**
```tsx
href="/admin/access-requests"
```
No `page.tsx` exists at `src/app/(app)/admin/access-requests/`. The current admin UI is at `/admin/users`. This link is shown to `isApprover` users and produces a 404.

---

### Finding 22 — Dead server action file: approver-actions.ts
**Area:** 4  
**Severity:** Medium  
**Surface:** `src/features/access-requests/approver-actions.ts`  
**Verbatim evidence:**
```
$ grep -rn "approver-actions" src/
(no results)
```
The file contains `approveRequest` and `denyRequest` — the old approval flow using `createUser()` + temp password. Zero imports. The active flow is `src/app/(app)/admin/users/actions.ts`. The file also contains a hardcoded production URL:
```ts
signInUrl: "https://kickstart-rush.vercel.app/sign-in",
```
and redirects to `/admin/access-requests` which no longer exists (Finding 21).

---

### Finding 23 — No error boundaries anywhere in the (app) route group
**Area:** 4  
**Severity:** Medium  
**Surface:** `src/app/(app)/`  
**Verbatim evidence:**
```
$ find src/app -name "error.tsx"
(no results)
```
Next.js App Router uses `error.tsx` files as per-segment error boundaries. Without one in `(app)`, any unhandled render error in a page or layout propagates to the root error handler. In production this shows a blank screen. Stack traces may be included in development mode payloads if `NODE_ENV` is not correctly set.

---

### Finding 24 — proxy.ts is orphaned middleware never registered with Next.js
**Area:** 4  
**Severity:** Informational  
**Surface:** `src/proxy.ts`  
**Verbatim evidence:**
```ts
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] };
```
No file imports `proxy.ts`. The Next.js middleware manifest confirms no middleware is registered. The file appears to be middleware code renamed or moved without being re-wired at `src/middleware.ts`. See also Finding 1.

---

### Finding 25 — console.error calls in production server actions
**Area:** 4  
**Severity:** Low  
**Surface:** multiple action files  
**Verbatim evidence:**
```
src/features/access-requests/actions.ts:76:   console.error('access_requests insert error:', reqErr);
src/features/access-requests/actions.ts:90:   console.error('access_request_teams insert error:', teamErr);
src/features/results/actions.ts:111:          console.error('cards insert error (create):', cardsError);
src/features/results/actions.ts:197:          console.error('cards insert error (update):', cardsError);
src/app/(app)/admin/users/actions.ts:65,69,83,87: console.error(...)
src/lib/email/send-invite.ts:111:             console.error('[sendInviteEmail] Gmail SMTP error:', err);
```
Server-side `console.error` calls are acceptable for error visibility, but they log to Vercel's function logs without structure. No log drains are configured (per deploy audit), so these disappear after the retention window.

---

### Finding 26 — Multiple as unknown as type coercions masking join type inference
**Area:** 4  
**Severity:** Low  
**Surface:** `src/app/(app)/fees/page.tsx`, `fixtures/page.tsx`, `fixtures/[id]/*`  
**Verbatim evidence:**
```tsx
const allFixtures = (fixturesRaw ?? []) as unknown as FixtureRow[];
const fixture = fixtureRaw as unknown as FixtureRow;
const existingLineup = existingLineupRaw as unknown as LineupRow | null;
const player = g.players as unknown as { first_name: string; last_name: string } | null;
```
8 occurrences total. These bypass TypeScript's type system for Supabase join query results. A Supabase schema type change would not be caught at compile time.

---

### Finding 27 — eslint-disable comment uses non-standard rule name react-hooks/purity
**Area:** 4  
**Severity:** Informational  
**Surface:** `src/app/(app)/layout.tsx:21`, `src/app/(app)/admin/users/page.tsx:66,109`  
**Verbatim evidence:**
```tsx
// eslint-disable-next-line react-hooks/purity
const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
```
`react-hooks/purity` is not a standard ESLint rule. ESLint silently ignores suppression comments for unknown rules, meaning if the actual offending rule ever fires these suppressions will have no effect. Likely a misremembered rule name.

---

### Finding 28 — goals constraint violation gives opaque error to client
**Area:** 4  
**Severity:** Low  
**Surface:** `src/features/live-match/actions.ts:170–182`  
**Verbatim evidence:**
```tsx
if (error) return { error: "Failed to log goal." };
```
The DB constraint `goals_scoring_team_player_check` rejects `scoring_team = 'kickstart'` with `player_id = NULL`. The user receives only `"Failed to log goal."` with no indication that a player selection is required.

---

## Area 5 — Operational

### Finding 29 — .env.example missing GMAIL_USER and GMAIL_APP_PASSWORD
**Area:** 5  
**Severity:** Medium  
**Surface:** `.env.example`  
**Verbatim evidence:**
```
# .env.example contains:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
OWNER_ALLOWED_EMAIL=

# Missing:
GMAIL_USER=
GMAIL_APP_PASSWORD=
```
Both `GMAIL_USER` and `GMAIL_APP_PASSWORD` are validated as required in `src/lib/env.ts` (`z.string().email()` and `z.string().min(10)` respectively). A developer following `.env.example` to set up a local environment would get a startup failure with no obvious explanation.

---

### Finding 30 — OWNER_ALLOWED_EMAIL required in env.ts but consumed nowhere
**Area:** 5  
**Severity:** Low  
**Surface:** `src/lib/env.ts`  
**Verbatim evidence:**
```ts
// src/lib/env.ts:29
OWNER_ALLOWED_EMAIL: z.string().email(),
```
```
$ grep -rn "OWNER_ALLOWED_EMAIL\|owner_allowed_email" src/
src/lib/env.ts:29: OWNER_ALLOWED_EMAIL: z.string().email(),
src/lib/env.ts:43: OWNER_ALLOWED_EMAIL: process.env.OWNER_ALLOWED_EMAIL,
```
Zero consumption sites outside `env.ts`. The sign-in action does not check email against this allowlist. The old `handle_new_user` Postgres trigger that enforced `owner_email` from `app_config` was dropped in a migration. The variable is validated at startup and will fail if absent, but has no runtime effect.

---

### Finding 31 — Health check returns ok:true regardless of RLS configuration
**Area:** 5  
**Severity:** Informational  
**Surface:** `src/app/api/health/route.ts`  
**Verbatim evidence:**
```ts
const { error } = await supabase.from("squads").select("id").limit(1);
if (!error) {
  return Response.json({ ok: true, supabase: "reachable", schema: "deployed" });
}
```
`squads` has `GRANT SELECT TO anon` with `USING(true)` (Finding 8). An unauthenticated health call succeeds with zero rows, no error — `ok: true`. If RLS were misconfigured to block all data, the health check would still return green. The endpoint does not verify that data is actually accessible to authenticated users.

---

### Finding 32 — No log drains configured; production errors not forwarded
**Area:** 5  
**Severity:** Informational  
**Surface:** Vercel project settings  
**Verbatim evidence:**
```
vercel ls --json  → no drains array
```
`console.error` calls (Finding 25) and runtime exceptions disappear after Vercel's log retention window. There is no Sentry, Datadog, or other error tracking integration. Post-deploy error scans rely entirely on manual CLI inspection.

---

## Severity-Ranked Findings Table

| # | Title | Area | Severity | Surface |
|---|-------|------|----------|---------|
| 1 | No middleware.ts — auth protection is layout-only | 2 | **High** | project root / `src/proxy.ts` |
| 2 | profile.status not checked; pending/denied users reach all (app) routes | 2 | **High** | `src/app/(app)/layout.tsx` |
| 3 | saveLineup action has no auth guard | 2 | **Medium** | `src/features/lineup/actions.ts` |
| 4 | createResult/updateResult scorer-count check bypassed via client-supplied team IDs | 1 | **Medium** | `src/features/results/actions.ts` |
| 5 | lineup_players RLS does not validate player belongs to lineup's squad | 1 | **Medium** | migration `20260513010000` |
| 11 | ON DELETE CASCADE on results→fixtures silently deletes result history | 3 | **Medium** | migration `20260512130000` |
| 18 | profiles table has no audit trigger | 5 | **Medium** | all migrations |
| 21 | Dead route /admin/access-requests linked from dashboard | 4 | **Medium** | `src/app/(app)/dashboard/page.tsx:64` |
| 22 | Dead server action file approver-actions.ts never imported | 4 | **Medium** | `src/features/access-requests/approver-actions.ts` |
| 23 | No error boundaries in (app) route group | 4 | **Medium** | `src/app/(app)/` |
| 29 | .env.example missing GMAIL_USER and GMAIL_APP_PASSWORD | 5 | **Medium** | `.env.example` |
| 7 | anon role granted SELECT on access_requests and access_request_teams | 1 | **Low** | migration `20260513223530` |
| 12 | goals table missing updated_at | 3 | **Low** | migration `20260512130000` |
| 13 | lineup_players table missing created_at and updated_at | 3 | **Low** | migration `20260512180000` |
| 14 | access_request_teams table missing all timestamp columns | 3 | **Low** | migration `20260513000000` |
| 15 | access_requests table missing updated_at | 3 | **Low** | migration `20260513000000` |
| 16 | profiles table missing updated_at | 3 | **Low** | migration `20260511000000` |
| 17 | admin_audit_log.actor_id nullable; purged actor's history unattributed | 3 | **Low** | migration `20260514210000` |
| 19 | competitions and competition_teams tables lack audit triggers | 5 | **Low** | migration `20260512000000` |
| 25 | console.error calls in production server actions | 4 | **Low** | multiple action files |
| 26 | Multiple as unknown as type coercions masking join type inference | 4 | **Low** | fees, fixtures, lineup pages |
| 27 | eslint-disable uses non-standard rule name react-hooks/purity | 4 | **Informational** | `(app)/layout.tsx`, `admin/users/page.tsx` |
| 28 | goals constraint violation gives opaque error to client | 4 | **Low** | `src/features/live-match/actions.ts` |
| 30 | OWNER_ALLOWED_EMAIL required in env.ts but consumed nowhere | 5 | **Low** | `src/lib/env.ts` |
| 6 | fixtures RLS exposes all competition fixtures across squads | 1 | **Informational** | migration `20260513040000` |
| 8 | squads anon SELECT policy uses USING(true) — full table exposed | 1 | **Informational** | migration `20260513080000` |
| 9 | inviteUserByEmail flow never sets must_change_password | 2 | **Informational** | `src/app/(app)/admin/users/actions.ts` |
| 10 | Suspended user heartbeat updates via admin client bypass RLS | 2 | **Informational** | `src/app/(app)/layout.tsx` |
| 20 | lineups RLS had a gap window between phase A and phase B migrations | 3 | **Informational** | migrations `20260512180000` → `20260513010000` |
| 24 | proxy.ts is orphaned middleware code never registered with Next.js | 4 | **Informational** | `src/proxy.ts` |
| 31 | Health check returns ok:true regardless of RLS configuration | 5 | **Informational** | `src/app/api/health/route.ts` |
| 32 | No log drains configured; production errors not forwarded | 5 | **Informational** | Vercel project settings |

---

*End of audit. No source files were modified during this analysis.*
