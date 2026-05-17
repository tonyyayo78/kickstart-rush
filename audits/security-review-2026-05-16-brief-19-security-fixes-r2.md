# Security Review R2 — 2026-05-16 — `brief-19-security-fixes`

**Reviewer:** security-reviewer agent (second invocation)
**Date:** 2026-05-16
**Branch:** `brief-19-security-fixes`
**Base:** `main`
**Model:** claude-sonnet-4-6
**Prior report:** `audits/security-review-2026-05-16-brief-19-security-fixes.md`

---

## 1. Scope Summary

**Files changed vs main (`git diff main --name-only`):**

```
src/app/(app)/fixtures/[id]/result/ResultForm.tsx
src/app/(app)/layout.tsx
src/features/results/actions.ts
src/lib/auth/require-approver.ts
supabase/migrations/20260517004911_lineup_players_squad_check.sql
```

**Additional commit since R1** (`b071e22`): `src/lib/auth/require-approver.ts` — added `status` and `removed_at` to the SELECT and added a guard that signs out and redirects if `status !== 'active'` or `removed_at !== null`, before the `is_approver` check.

This R2 review re-examines the two prior High findings and runs the full checklist again. No new file surfaces were introduced between R1 and R2.

---

## 2. Prior High Findings — Status

### Prior Finding 1 — `proxy.ts` not wired by Next.js

**Status: CONFIRMED FALSE POSITIVE — closed.**

The prior report flagged `src/proxy.ts` as dead code because Next.js conventionally expects `middleware.ts`. This is incorrect for Next.js 16.

**Verification evidence from `node_modules/next/dist/esm/lib/constants.js`:**

```javascript
// Patterns to detect proxy files (replacement for middleware)
export const PROXY_FILENAME = 'proxy';
export const PROXY_LOCATION_REGEXP = `(?:src/)?${PROXY_FILENAME}`;
```

**Verification evidence from `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`:**

```markdown
> **Good to know**: Starting with Next.js 16, Middleware is now called Proxy to better
> reflect its purpose. The functionality remains the same.

### Convention

Create a `proxy.ts` (or `.js`) file in the project root, or inside `src` if applicable

### Example

You can export your proxy function as either a default export or a named `proxy` export:

```ts filename="proxy.ts"
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}
export const config = { matcher: '/about/:path*' }
```
```

**From `node_modules/next/dist/build/index.js` (lines 614, 633–634, 651):**

```javascript
const proxyDetectionRegExp = new RegExp(
  `^${_constants.PROXY_FILENAME}\\.(?:${config.pageExtensions.join('|')})$`
);
// ...
if (isAtConventionLevel && fileBaseName === _constants.PROXY_FILENAME) {
  proxyFilePath = rootPath;
}
// ...
_log.warnOnce(`The "${_constants.MIDDLEWARE_FILENAME}" file convention is deprecated. Please use "${_constants.PROXY_FILENAME}" instead.`);
```

`src/proxy.ts` with `export async function proxy(request: NextRequest)` and `export const config` matches the Next.js 16 convention exactly. The build system detects `src/` as a valid convention level and picks up `proxy.ts`. Additionally, the main conversation has runtime proof (Turbopack writes matchers to `_clientMiddlewareManifest.js`; `/api/auth/callback → 307` with no session confirms the proxy is running). **This finding is closed.**

---

### Prior Finding 2 — `requireApprover` missing `status`/`removed_at` check

**Status: RESOLVED — closed.**

**Verbatim current state of `src/lib/auth/require-approver.ts` (entire file):**

```typescript
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function requireApprover() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, is_approver, status, removed_at")
    .eq("id", user.id)
    .single();

  // Defence-in-depth: lock out non-active or removed users at the
  // admin-action gate, matching the (app) layout's check. Addresses
  // security-reviewer Finding 2 against brief-19-security-fixes.
  if (!profile || profile.status !== "active" || profile.removed_at !== null) {
    await supabase.auth.signOut();
    redirect("/sign-in");
  }

  if (!profile.is_approver) redirect("/dashboard");
  return profile as { id: string; email: string; is_approver: boolean };
}
```

`status` and `removed_at` are now selected and checked before the `is_approver` check. The guard calls `supabase.auth.signOut()` before redirecting, which invalidates the session server-side. **This finding is closed.**

---

## 3. Full Checklist — R2 Pass

### 3.1 RLS coverage on the diff

The only migration in the diff is `20260517004911_lineup_players_squad_check.sql`. This migration:
- Drops and recreates an existing policy (`lineup_players_active_squad`) — does not create a new table.
- Adds a second `AND EXISTS` clause requiring `player.squad_id IN (user_accessible_squads())`.
- The `USING` and `WITH CHECK` clauses are symmetric (same predicate).
- No new table, no new columns, no privilege grants.
- The `OR` in the fixture-team clause is pre-existing behaviour, documented in R1 Finding 5 (Low, deferred). No change in this commit.

**Verdict:** Migration is a net tightening of RLS. No new weaknesses introduced.

### 3.2 Server-side auth guards

**`src/lib/auth/require-approver.ts`** — `getUser()` called first; then `status` + `removed_at` guard; then `is_approver` check. Order is correct. Sign-out before redirect prevents token reuse.

**`src/app/(app)/layout.tsx`** — `getUser()` at line 14; then `status`/`removed_at` guard at line 29 (with sign-out); then `must_change_password` redirect. Order is correct.

**`src/features/results/actions.ts`** — `getUser()` at lines 38 and 144. Fixture lookup via `supabase` (RLS-scoped server client), so a user can only see fixtures in their accessible squads. `resultId` in `updateResult` is used in a `.eq("id", resultId)` update without a direct ownership subquery — but this is protected by the `results_active_squad` RLS policy on the `results` table, which scopes writes to the user's accessible squads. The `fixtureId` parameter in `updateResult` is used for the fixture lookup and card operations; the fixture lookup is RLS-gated. No IDOR path identified beyond what was noted in R1 Finding 4 (scorer `competitionTeamId` not validated against fixture teams — still Medium, unchanged from R1).

### 3.3 Service-role key leakage

```
grep -rn "SERVICE_ROLE|createAdminClient" app/ components/ lib/
```

Results:
- `src/app/(app)/layout.tsx` — `createAdminClient` for heartbeat. This file is a Server Component (no `'use client'`). `admin.ts` has `import 'server-only'`. **Not a leak.**
- `src/app/(app)/admin/users/page.tsx` — `createAdminClient`. Server Component. **Not a leak.**
- `src/app/(app)/admin/users/actions.ts` — `createAdminClient`. `'use server'` at line 1. **Not a leak.**
- `src/lib/env.ts` — references `SUPABASE_SERVICE_ROLE_KEY` for validation only; no `createClient` call. Server-side only (imported only by server modules per the file's own comment). **Not a leak.**

No service-role client usage found in client components, route handlers accessible by anon users, or files without server-only guards.

### 3.4 Self-action guards

All eight mutating admin actions call `requireApprover()` and six of the seven user-targeting actions call `selfGuard()`:

| Action | requireApprover | selfGuard |
|--------|----------------|-----------|
| `approveRequest` | Yes | N/A — targets a request_id, not a user_id |
| `denyRequest` | Yes | N/A — targets a request_id, not a user_id |
| `forceLogout` | Yes | Yes (line 134) |
| `suspend` | Yes | Yes (line 148) |
| `reactivate` | Yes | Yes (line 164) |
| `remove` | Yes | Yes (line 180) |
| `restore` | Yes | Yes (line 211) |
| `purge` | Yes | Yes (line 237) |

`approveRequest` and `denyRequest` operate on `access_requests.id`, not on a `profiles.id` — self-action via these paths is not meaningful, and no guard is needed.

**Verdict:** Self-action guard coverage is complete.

### 3.5 Proxy / middleware gating

`src/proxy.ts` (confirmed wired by Next.js 16 — see Prior Finding 1 above):
- Calls `supabase.auth.getUser()` on every request (re-validates token server-side; not `getSession()`).
- Redirects unauthenticated users to `/sign-in` for all non-public paths.
- Handles `/` redirect (authenticated → `/dashboard`, unauthenticated → `/public/standings`).
- Adds `X-Robots-Tag: noindex,nofollow` to public paths.
- Matcher covers all routes except `_next/static`, `_next/image`, `_next/webpack-hmr`, `favicon.ico`, `robots.txt`, and static file extensions.

**One observation (Medium, pre-existing, not introduced by this branch):** The proxy does not check `profiles.status` or `profiles.removed_at`. It relies on `getUser()` returning `null` for banned users (Supabase Auth enforces `ban_duration` at token validation time). This is the intended defence: `suspend` and `remove` both call `admin.auth.admin.updateUserById({ ban_duration: '876000h' })` and `admin.auth.admin.signOut(userId, 'global')`, which invalidates existing sessions and prevents new ones. The profile-level `status`/`removed_at` checks in the layout and `requireApprover` are defence-in-depth for the case where a token slips through (e.g., offline JWT validation). However, `profiles.status` is constrained to `('pending', 'active', 'denied')` — there is no `'suspended'` value. A suspended user's profile continues to show `status = 'active'`; the ban is enforced at the auth layer, not the status field. This is a pre-existing design characteristic documented here for clarity, not a new vulnerability.

### 3.6 UI scoping

No "hide-in-UI-for-security" patterns found in the diff. All access controls are enforced via server actions, RLS, and the layout guard.

---

## 4. Findings

All findings from R1 that remain open carry forward unchanged. The two prior Highs are both resolved or confirmed false-positive (see Section 2). No new Critical or High findings were discovered in this R2 review.

### Finding 1 — (CLOSED) Proxy file naming — confirmed false positive

**Severity:** ~~High~~ — **CLOSED: false positive**
See Section 2, Prior Finding 1. `proxy.ts` is the correct Next.js 16 convention.

---

### Finding 2 — (CLOSED) `requireApprover` missing status/removed_at check

**Severity:** ~~High~~ — **CLOSED: resolved in commit `b071e22`**
See Section 2, Prior Finding 2.

---

### Finding 3 — `user_accessible_squads()` does not filter by `removed_at` *(carried from R1)*

**Severity:** Medium
**Surface:** `supabase/migrations/20260513020000_fix_user_accessible_squads.sql` (lines 18–29)
**Verbatim evidence:**

```sql
CREATE OR REPLACE FUNCTION public.user_accessible_squads()
  RETURNS TABLE(squad_id uuid)
  LANGUAGE sql
  STABLE
  SET search_path = public
AS $$
  SELECT pt.squad_id
  FROM   public.profile_teams pt
  JOIN   public.profiles p ON p.id = pt.profile_id
  WHERE  pt.profile_id = auth.uid()
    AND  p.status = 'active'
$$;
```

`removed_at` is not checked. In the current implementation this is partially mitigated by the fact that `remove` sets `ban_duration = '876000h'` (invalidating the auth token) before setting `removed_at`, so `getUser()` returns null and the request is blocked before RLS is evaluated. However, a compromised or replayed token could bypass the ban check and reach RLS, which would still return squad data if `status = 'active'` and `removed_at IS NOT NULL`.

**Why this matters:** Defence-in-depth requires each layer to be independently sufficient. The RLS layer currently trusts that a valid token implies a non-removed user, which is only true if the Supabase Auth ban mechanism is working correctly.

**Remediation hint:** Add `AND p.removed_at IS NULL` to `user_accessible_squads()` in a new migration.

---

### Finding 4 — Scorer `competitionTeamId` not validated against fixture teams *(carried from R1)*

**Severity:** Medium
**Surface:** `src/features/results/actions.ts` — `createResult` (lines 96–103) and `updateResult` (lines 195–203)
**Verbatim evidence:**

```typescript
// Both createResult and updateResult — client-supplied competitionTeamId
// inserted verbatim without checking it equals homeTeamId or awayTeamId:
scorers.map((s) => ({
  result_id: result.id,
  competition_team_id: s.competitionTeamId,   // ← client-supplied UUID, not validated
  player_id: s.playerId,
  minute: s.minute,
  is_own_goal: s.isOwnGoal,
}))
```

The scorer-count invariant now uses server-side team IDs correctly (R1 Fix 3 resolved the team ID spoofing). However, a scorer entry whose `competitionTeamId` is neither `homeTeamId` nor `awayTeamId` passes the count filter (it contributes 0 to either side's count) and is inserted without rejection.

**Why this matters:** An attacker or client-side bug can write a goal record attributing a goal to a competition team not on the fixture, corrupting standings and analytics. The `goals_active_squad` RLS policy does not constrain `competition_team_id` to the fixture's two teams.

**Remediation hint:** After looking up `homeTeamId` and `awayTeamId` from the fixture, add a server-side validation pass over `scorers` that rejects any entry whose `competitionTeamId` is not in `{homeTeamId, awayTeamId}`.

---

### Finding 5 — New lineup policy: OR fixture-team check allows cross-squad player insertion for multi-squad owners *(carried from R1, Low, deferred and acknowledged)*

**Severity:** Low
**Surface:** `supabase/migrations/20260517004911_lineup_players_squad_check.sql` (lines 26–29, 46–49)
**Verbatim evidence:**

```sql
-- USING and WITH CHECK both contain:
WHERE  l.id = lineup_id
  AND  (
    ht.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
    OR at.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
  )
```

```sql
-- Minimal fix: the player's squad must also be in the user's
-- accessible squads. (Stricter version — requiring the player's
-- squad to match the fixture's competing teams — is deferred.)
```

Not an immediate exploit. Noted as deferred technical debt in the migration comment. Documented here to track.

**Remediation hint:** Replace the player squad check with a correlated subquery that constrains `p.squad_id` to the specific squads of the fixture's home and away teams, not any accessible squad.

---

### Finding 6 — Admin heartbeat errors silently swallowed *(carried from R1, Low)*

**Severity:** Low
**Surface:** `src/app/(app)/layout.tsx` (lines 36–48)
**Verbatim evidence:**

```typescript
try {
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const now = new Date().toISOString();
  await createAdminClient()
    .from("profiles")
    .update({ last_active_at: now })
    .eq("id", user.id)
    .or(`last_active_at.is.null,last_active_at.lt.${sixtySecondsAgo}`);
} catch {
  // swallow — heartbeat failure never blocks a page render
}
```

Not exploitable. The `user.id` is validated via `getUser()`. Silent error swallowing means heartbeat failures are invisible in production logs.

**Remediation hint:** Log at `console.warn` before swallowing so operational issues surface without blocking renders.

---

## 5. Summary Table

| # | Severity | Title | Surface | R2 Status |
|---|----------|-------|---------|-----------|
| 1 | ~~High~~ | Proxy named `proxy.ts` — not wired by Next.js | `src/proxy.ts` | **CLOSED — false positive** |
| 2 | ~~High~~ | `requireApprover` missing `status`/`removed_at` | `src/lib/auth/require-approver.ts` | **CLOSED — resolved in `b071e22`** |
| 3 | **Medium** | `user_accessible_squads()` does not filter by `removed_at` | `supabase/migrations/20260513020000_fix_user_accessible_squads.sql` | Open (carried from R1) |
| 4 | **Medium** | Scorer `competitionTeamId` not validated against fixture teams | `src/features/results/actions.ts` | Open (carried from R1) |
| 5 | **Low** | Lineup policy: OR fixture-team check allows cross-squad insert (deferred, acknowledged) | `supabase/migrations/20260517004911_lineup_players_squad_check.sql` | Open (carried from R1) |
| 6 | **Low** | Admin heartbeat errors silently swallowed | `src/app/(app)/layout.tsx` | Open (carried from R1) |

**New Critical findings:** 0
**New High findings:** 0
**Findings resolved since R1:** 2 (both prior Highs — one false positive, one fixed)
**Remaining open:** 2 Medium, 2 Low

---

## 6. R2 Verdict

Both prior High findings are resolved or confirmed false-positive. No new Critical or High issues were discovered. The branch is safe to merge from a security standpoint, subject to the two Medium findings (Findings 3 and 4) being tracked as follow-on work.

---

*Report generated by the security-reviewer agent (R2). READ-ONLY review — no application code was modified.*
