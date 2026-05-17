# Security Review — 2026-05-16 — `brief-19-security-fixes`

**Reviewer:** security-reviewer agent  
**Date:** 2026-05-16  
**Branch:** `brief-19-security-fixes`  
**Base:** `main`  
**Model:** claude-sonnet-4-6

---

## 1. Scope Summary

**Files changed vs main (`git diff main --name-only`):**

```
src/app/(app)/fixtures/[id]/result/ResultForm.tsx
src/app/(app)/layout.tsx
src/features/results/actions.ts
supabase/migrations/20260517004911_lineup_players_squad_check.sql
```

**Change summary:**
- **Fix 1 (proxy.ts wiring):** No code change — confirmed as false positive in this review. `src/proxy.ts` exists but is not wired as `middleware.ts`. This is a pre-existing architectural issue (already logged as Finding 1 below; the branch makes no claim to fix it).
- **Fix 2 (layout.tsx):** Added `status` and `removed_at` to the profile SELECT, added a status/removed_at guard that signs the user out and redirects before any app content is rendered, moved the `must_change_password` redirect after the status check, and moved the heartbeat block after the status guard.
- **Fix 3 (results actions + ResultForm):** Removed `homeTeamId`/`awayTeamId` from the Zod schema and the client form payload. Both `createResult` and `updateResult` now look up team IDs server-side from the fixture row.
- **Fix 4 (migration):** New migration `20260517004911_lineup_players_squad_check.sql` adds a second `EXISTS` clause to `lineup_players_active_squad` (both `USING` and `WITH CHECK`) requiring the inserted player's `squad_id` to be in the user's accessible squads.

---

## 2. Findings

### Finding 1 — Middleware file named `proxy.ts` instead of `middleware.ts` — not wired by Next.js

**Severity:** High  
**Surface:** `src/proxy.ts` (entire file), project root (no `middleware.ts` present)  
**Verbatim evidence:**

```typescript
// src/proxy.ts — exported function, never invoked by Next.js
export async function proxy(request: NextRequest) {
  // ...
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isPublicPath(request.nextUrl.pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    return NextResponse.redirect(redirectUrl);
  }
  // ...
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)",
  ],
};
```

No `middleware.ts` exists at `src/middleware.ts` or the project root. The function `proxy` is exported but never imported or called by any other file (confirmed by `grep -rn "from.*proxy" src/` returning zero results).

**Why this matters:** Next.js middleware must live at `src/middleware.ts` (or `middleware.ts` at the project root) and must export a function named `middleware` as the default or named export per Next.js App Router conventions. The current `src/proxy.ts` is dead code — the auth redirect, `getUser()` call, and matcher config inside it are never executed. Any unauthenticated request to a protected route (e.g., `/fixtures`, `/admin/users`) reaches the server action / page handler with no middleware-layer auth check. The defence-in-depth audit model requires a working middleware layer; its absence means the layout's `getUser()` is the sole first-line check, and direct API calls to route handlers (which do not render layouts) may have no auth guard at all.

**Remediation hint:** Rename `src/proxy.ts` to `src/middleware.ts` and rename the exported function from `proxy` to `middleware`, or add a `src/middleware.ts` that imports and re-exports `proxy` as `middleware`. Verify with `next build` that middleware is detected.

---

### Finding 2 — `require-approver` does not check `status` or `removed_at`

**Severity:** High  
**Surface:** `src/lib/auth/require-approver.ts` (lines 4–18), used by all admin actions in `src/app/(app)/admin/users/actions.ts`  
**Verbatim evidence:**

```typescript
export async function requireApprover() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, is_approver")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approver) redirect("/dashboard");
  return profile as { id: string; email: string; is_approver: boolean };
}
```

`status` and `removed_at` are not selected or checked. A user whose profile has `status != 'active'` or `removed_at IS NOT NULL` (i.e., has been soft-deleted/suspended) can still invoke any admin server action if their Supabase session token remains valid and `is_approver` is still `true`.

**Why this matters:** Fix 2 in this branch correctly adds a status/removed_at guard to `(app)/layout.tsx`, but that guard is rendered by the layout Server Component only — it does not protect the admin server actions. An approver who has been suspended or removed retains a valid session token for the duration of the JWT TTL. Calling an admin server action (e.g., `suspend`, `purge`, `remove`) directly bypasses the layout and reaches `requireApprover`, which only checks `is_approver`. Admin actions include `admin.auth.admin.deleteUser` via `createAdminClient()`, making this an elevated-privilege bypass.

**Remediation hint:** Add `.select("id, email, is_approver, status, removed_at")` to the `requireApprover` profile query and reject the caller (redirect to `/sign-in` after signing out) if `status !== 'active'` or `removed_at !== null`.

---

### Finding 3 — `user_accessible_squads()` does not filter by `removed_at`

**Severity:** Medium  
**Surface:** `supabase/migrations/20260513020000_fix_user_accessible_squads.sql` (lines 18–29), cross-referenced with `supabase/migrations/20260514210000_admin_user_management.sql` (introduces `removed_at`)  
**Verbatim evidence:**

```sql
-- 20260513020000_fix_user_accessible_squads.sql — current canonical definition
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

`removed_at` was added to `profiles` in migration `20260514210000_admin_user_management.sql`, after `user_accessible_squads()` was last defined. The function checks `p.status = 'active'` but not `p.removed_at IS NULL`. Every RLS policy on squad-scoped tables (`fixtures`, `players`, `results`, `goals`, `match_fees`, `lineups`, `lineup_players`) delegates to this function.

**Why this matters:** A removed user (i.e., `removed_at IS NOT NULL`) whose `status` is still `'active'` (a plausible state if the `remove` admin action sets `removed_at` but does not also flip `status`) would still be granted RLS access to squad data through the underlying Supabase session if their JWT is still valid. Even if the current `remove` action always bans via `auth.admin.updateUserById`, the ban is enforced at the token-issuance layer, not at RLS query time — a compromised or cached token could still read data.

**Remediation hint:** Update `user_accessible_squads()` to add `AND p.removed_at IS NULL` to the filter predicate, in a new migration (do not edit the committed migration).

---

### Finding 4 — Scorer `competitionTeamId` not validated against fixture's actual teams before DB insert

**Severity:** Medium  
**Surface:** `src/features/results/actions.ts` — `createResult` (lines 64–98) and `updateResult` (lines 169–198)  
**Verbatim evidence:**

```typescript
// Both createResult and updateResult — team IDs now come from fixture:
const homeTeamId = fixture.home_team_id;
const awayTeamId = fixture.away_team_id;

const homeScorers = scorers.filter((s) => s.competitionTeamId === homeTeamId).length;
const awayScorers = scorers.filter((s) => s.competitionTeamId === awayTeamId).length;
if (homeScorers > homeScore) {
  return { error: `Too many home scorers (${homeScorers}) for the score (${homeScore}).` };
}
if (awayScorers > awayScore) {
  return { error: `Too many away scorers (${awayScorers}) for the score (${awayScore}).` };
}

// ...then insert every scorer's competitionTeamId verbatim:
scorers.map((s) => ({
  result_id: result.id,
  competition_team_id: s.competitionTeamId,   // ← client-supplied UUID, not validated
  player_id: s.playerId,
  minute: s.minute,
  is_own_goal: s.isOwnGoal,
}))
```

Fix 3 correctly removed client-supplied `homeTeamId`/`awayTeamId` and replaced them with server-side lookups. The scorer-count check now uses the trusted team IDs. However, the `competitionTeamId` on each scorer entry is still fully client-supplied — it is only used in the filter for counting purposes, not to validate that it equals `homeTeamId` or `awayTeamId` before the DB insert. A client could send a scorer row with an arbitrary `competitionTeamId` UUID (belonging to a different competition team entirely). The `goals_active_squad` RLS policy would reject such a row only if the row's `result_id` reaches a fixture not in the user's accessible squads — it does not validate that the `competition_team_id` is one of the two teams on the fixture.

**Why this matters:** An attacker (or a client-side bug) can write a goal record attributing a goal to a competition team that is not part of the fixture, corrupting standings and analytics. The RLS layer (`goals_active_squad`) does not constrain `competition_team_id` to `{fixture.home_team_id, fixture.away_team_id}` — it only ensures the result's fixture is in an accessible squad. This is a data-integrity issue that degrades to a security issue in multi-squad deployments (a coach could write a goal to a team in their accessible squads that is not in the fixture).

**Remediation hint:** After looking up `homeTeamId` and `awayTeamId` from the fixture, add a server-side validation pass over `scorers` that rejects any entry whose `competitionTeamId` is neither `homeTeamId` nor `awayTeamId`. This can be a simple early-return with an error message before the DB insert.

---

### Finding 5 — New `lineup_players` policy: `OR` fixture-team check allows cross-squad player insertion when user has access to both squads

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

The fixture-squad clause uses `OR` (the same as the previous policy). This means a user with access to KP2026 can pass the fixture check by satisfying `ht.squad_id IN (accessible_squads)` for a KP2026 fixture, and the new player-squad clause then only checks `p.squad_id IN (accessible_squads)` — not `p.squad_id = fixture_home_team.squad_id OR p.squad_id = fixture_away_team.squad_id`. The migration comment acknowledges this deferred stricter version:

```sql
-- Minimal fix: the player's squad must also be in the user's
-- accessible squads. (Stricter version — requiring the player's
-- squad to match the fixture's competing teams — is deferred.)
```

**Why this matters:** In a future multi-squad owner scenario (an owner with access to both KP2026 and KE2026), the policy would permit inserting a KE2026 player into a KP2026 fixture lineup, because both squad IDs are accessible. This is a known deferred issue per the comment, not an immediate exploit. Documented here to track the technical debt.

**Remediation hint:** When the deferred stricter version is implemented, replace the player squad check with a join or correlated subquery that constrains `p.squad_id` to the specific squads of the fixture's home and away teams, not just any accessible squad.

---

### Finding 6 — Layout heartbeat runs after status guard but uses service-role client without re-confirming user identity

**Severity:** Low  
**Surface:** `src/app/(app)/layout.tsx` (lines 36–48)  
**Verbatim evidence:**

```typescript
// Best-effort heartbeat — throttled to one write per 60s per user
try {
  // eslint-disable-next-line react-hooks/purity
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

The admin client (service role, bypasses RLS) is used for the heartbeat. The `user.id` comes from the `getUser()` call earlier in the same function (line 14–16), which is re-validated against Supabase Auth on every request — this is correct. The fix moved this block after the `status` check, which is also correct. The low-severity concern is stylistic: the service-role write filter uses `.or(...)` with a raw string constructed from a JS timestamp, and errors are silently swallowed. A malformed timestamp would silently fail to update.

**Why this matters:** Not exploitable. The `user.id` is already validated via `getUser()`. This is noted as a code-quality issue: errors from admin client writes being silently swallowed means heartbeat failures will never surface in logs.

**Remediation hint:** Log the error at `console.warn` level before swallowing, so operational issues with the heartbeat are observable in production logs without blocking renders.

---

## 3. Summary Table

| # | Severity | Title | Surface |
|---|----------|-------|---------|
| 1 | **High** | Middleware named `proxy.ts` — not wired by Next.js, dead code | `src/proxy.ts`, no `middleware.ts` present |
| 2 | **High** | `requireApprover` does not check `status`/`removed_at` | `src/lib/auth/require-approver.ts`, all admin actions |
| 3 | **Medium** | `user_accessible_squads()` does not filter by `removed_at` | `supabase/migrations/20260513020000_fix_user_accessible_squads.sql` |
| 4 | **Medium** | Scorer `competitionTeamId` not validated against fixture teams | `src/features/results/actions.ts` — `createResult`, `updateResult` |
| 5 | **Low** | New lineup policy: OR fixture-team check allows cross-squad insert for multi-squad owners (deferred, acknowledged) | `supabase/migrations/20260517004911_lineup_players_squad_check.sql` |
| 6 | **Low** | Admin heartbeat errors silently swallowed, no logging | `src/app/(app)/layout.tsx` lines 36–48 |

---

## 4. Fixes Verified on this Branch

The following items from the 2026-05-15 audit were addressed and are **confirmed closed** in this branch:

| Prior Finding | Resolution | Verified |
|--------------|-----------|---------|
| Status/removed_at not checked in layout before rendering app | `layout.tsx`: `status` and `removed_at` now fetched and checked; non-active/removed users are signed out and redirected before any app content renders or heartbeat runs | Yes |
| `homeTeamId`/`awayTeamId` accepted from client in result schema | Both actions now look up `home_team_id`/`away_team_id` from the fixture server-side; fields removed from Zod schema and `ResultForm.tsx` | Yes |
| `lineup_players` RLS did not verify player squad membership | New migration adds `AND EXISTS (player squad IN accessible_squads)` clause to both `USING` and `WITH CHECK` | Yes |
| Self-action guard on admin mutations | `selfGuard()` helper verified present on all mutating admin actions (`forceLogout`, `suspend`, `reactivate`, `remove`, `restore`, `purge`) | Yes (pre-existing, not in scope of this branch) |

---

*Report generated by the security-reviewer agent. READ-ONLY review — no application code was modified.*
