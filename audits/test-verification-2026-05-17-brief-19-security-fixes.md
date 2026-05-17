# Test Verification Report
**Branch:** `brief-19-security-fixes`
**Date:** 2026-05-17
**Verifier:** Claude Sonnet 4.6 (test-verifier agent)
**Brief:** Brief 19 — Security fixes from 2026-05-15 audit
**Total criteria:** 16

---

## Status Table

| # | Criterion | Status |
|---|-----------|--------|
| AC-1 | `proxy.ts` exists at `src/` level; Next.js exports `PROXY_FILENAME='proxy'` | ✅ Met |
| AC-2 | `proxy.ts` exports named `proxy` function + `config` with `matcher` array | ✅ Met |
| AC-3 | `layout.tsx` selects `status` and `removed_at` from profiles | ✅ Met |
| AC-4 | `layout.tsx` status guard fires before app JSX | ✅ Met |
| AC-5 | Status guard calls `signOut` before redirecting | ✅ Met |
| AC-6 | `must_change_password` redirect is after status guard | ✅ Met |
| AC-7 | `createResult` Zod schema has no `homeTeamId`/`awayTeamId` | ✅ Met |
| AC-8 | `createResult` fetches fixture server-side for team IDs | ✅ Met |
| AC-9 | `updateResult` Zod schema has no `homeTeamId`/`awayTeamId` | ✅ Met |
| AC-10 | `updateResult` fetches fixture server-side for team IDs | ✅ Met |
| AC-11 | `ResultForm` does not send `homeTeamId`/`awayTeamId` in payload | ✅ Met |
| AC-12 | Migration adds player-squad check to `USING` clause | ✅ Met |
| AC-13 | Migration adds player-squad check to `WITH CHECK` clause | ✅ Met |
| AC-14 | `requireApprover` selects `status` and `removed_at` | ✅ Met |
| AC-15 | `requireApprover` rejects non-active/removed before `is_approver`; calls `signOut` | ✅ Met |
| AC-16 | Both security-reviewer reports exist in `audits/` | ✅ Met |

---

## Detail

### AC-1 — proxy.ts wiring confirmed

**Met.**

`src/proxy.ts` exists (76 lines). No `src/middleware.ts` present.

`node_modules/next/dist/esm/lib/constants.js` exports:
```javascript
export const PROXY_FILENAME = 'proxy';
export const PROXY_LOCATION_REGEXP = `(?:src/)?${PROXY_FILENAME}`;
```
This confirms `src/proxy.ts` is the correct conventional filename for this version of Next.js.

---

### AC-2 — proxy.ts exports named `proxy` function and `config`

**Met.**

`src/proxy.ts` lines 18 and 69–75:
```typescript
export async function proxy(request: NextRequest) {
  // ...
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)",
  ],
};
```
Named export `proxy` and `config` with `matcher` array both present.

---

### AC-3 — layout.tsx selects `status` and `removed_at`

**Met.**

`src/app/(app)/layout.tsx` line 21:
```typescript
.select("email, display_name, is_approver, must_change_password, status, removed_at")
```
Both `status` and `removed_at` are in the select string.

---

### AC-4 — layout.tsx status guard fires before app JSX

**Met.**

`src/app/(app)/layout.tsx` lines 29–32:
```typescript
if (!profile || profile.status !== "active" || profile.removed_at !== null) {
  await supabase.auth.signOut();
  redirect("/sign-in");
}
```
Guard at line 29. JSX `return (` begins at line 59. The guard fires well before any JSX is returned.

---

### AC-5 — Status guard calls `signOut` before redirecting

**Met.**

`src/app/(app)/layout.tsx` lines 30–31:
```typescript
await supabase.auth.signOut();
redirect("/sign-in");
```
`signOut()` on line 30, `redirect()` on line 31. Correct order.

---

### AC-6 — `must_change_password` redirect is after status guard

**Met.**

Status/removed_at guard: lines 29–32.
`must_change_password` redirect: line 34:
```typescript
if (profile.must_change_password) redirect("/auth/set-password");
```
Line 34 is after line 32. Correct ordering.

---

### AC-7 — createResult Zod schema has no homeTeamId/awayTeamId

**Met.**

`src/features/results/actions.ts` lines 21–29 (`resultSchema`):
```typescript
const resultSchema = z.object({
  fixtureId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  matchNotes: z.string().max(5000).optional(),
  scorers: z.array(goalSchema),
  cards: z.array(cardSchema).default([]),
  // homeTeamId / awayTeamId removed — looked up server-side from the fixture.
});
```
Neither `homeTeamId` nor `awayTeamId` appear in the schema.

---

### AC-8 — createResult performs server-side fixture lookup

**Met.**

`src/features/results/actions.ts` lines 51–62 (inside `createResult`):
```typescript
const { data: fixture, error: fixtureError } = await supabase
  .from("fixtures")
  .select("home_team_id, away_team_id")
  .eq("id", fixtureId)
  .single();

if (fixtureError || !fixture) {
  return { error: "Fixture not found." };
}

const homeTeamId = fixture.home_team_id;
const awayTeamId = fixture.away_team_id;
```

---

### AC-9 — updateResult Zod schema has no homeTeamId/awayTeamId

**Met.**

`updateResult` reuses the same `resultSchema` (lines 21–29), which contains no `homeTeamId` or `awayTeamId`. Destructure at line 152:
```typescript
const { homeScore, awayScore, matchNotes, scorers, cards } = parsed.data;
```

---

### AC-10 — updateResult performs server-side fixture lookup

**Met.**

`src/features/results/actions.ts` lines 156–167 (inside `updateResult`):
```typescript
const { data: fixture, error: fixtureError } = await supabase
  .from("fixtures")
  .select("home_team_id, away_team_id")
  .eq("id", fixtureId)
  .single();

if (fixtureError || !fixture) {
  return { error: "Fixture not found." };
}

const homeTeamId = fixture.home_team_id;
const awayTeamId = fixture.away_team_id;
```
Identical in structure to `createResult`.

---

### AC-11 — ResultForm does not send homeTeamId/awayTeamId in payload

**Met.**

`src/app/(app)/fixtures/[id]/result/ResultForm.tsx` lines 219–236 (the `input` object in `handleSubmit`):
```typescript
const input = {
  fixtureId,
  homeScore,
  awayScore,
  matchNotes: matchNotes.trim() || undefined,
  scorers: scorers.map((s) => ({
    competitionTeamId: s.competitionTeamId,
    playerId: s.playerId || null,
    minute: s.minute ? parseInt(s.minute, 10) : null,
    isOwnGoal: s.isOwnGoal,
  })),
  cards: cards.map((c) => ({
    playerId: c.playerId,
    cardType: c.cardType,
    minute: c.minute ? parseInt(c.minute, 10) : null,
    note: c.note.trim() || undefined,
  })),
};
```
No `homeTeamId` or `awayTeamId` keys in the payload.

---

### AC-12 — Migration adds player-squad CHECK to USING clause

**Met.**

`supabase/migrations/20260517004911_lineup_players_squad_check.sql` lines 32–37:
```sql
AND EXISTS (
  SELECT 1
  FROM   public.players p
  WHERE  p.id = player_id
    AND  p.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
)
```
`EXISTS` sub-clause in the `USING` block checks player's `squad_id` against `user_accessible_squads()`.

---

### AC-13 — Migration adds player-squad CHECK to WITH CHECK clause

**Met.**

`supabase/migrations/20260517004911_lineup_players_squad_check.sql` lines 51–57:
```sql
AND EXISTS (
  SELECT 1
  FROM   public.players p
  WHERE  p.id = player_id
    AND  p.squad_id IN (SELECT squad_id FROM public.user_accessible_squads())
)
```
`WITH CHECK` clause is symmetric with `USING` and contains the same player-squad sub-clause.

---

### AC-14 — requireApprover selects `status` and `removed_at`

**Met.**

`src/lib/auth/require-approver.ts` lines 11–15:
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("id, email, is_approver, status, removed_at")
  .eq("id", user.id)
  .single();
```
Both `status` and `removed_at` present in the select string.

---

### AC-15 — requireApprover rejects non-active/removed before is_approver; calls signOut

**Met.**

`src/lib/auth/require-approver.ts` lines 20–25:
```typescript
if (!profile || profile.status !== "active" || profile.removed_at !== null) {
  await supabase.auth.signOut();
  redirect("/sign-in");
}

if (!profile.is_approver) redirect("/dashboard");
```
Status/removed_at guard at lines 20–23. `is_approver` check at line 25, after the guard. `signOut()` at line 21 before `redirect()` at line 22.

---

### AC-16 — Security-reviewer reports present in audits/

**Met.**

Both files confirmed present:
- `audits/security-review-2026-05-16-brief-19-security-fixes.md`
- `audits/security-review-2026-05-16-brief-19-security-fixes-r2.md`

---

## Summary

| Outcome | Count |
|---------|-------|
| ✅ Met | 16 |
| ❌ Not Met | 0 |
| ⚠️ Partial | 0 |
| ❓ Unverifiable | 0 |

**All 16 acceptance criteria are met. Branch is ready for PR.**

Every criterion is verified by static code evidence. The status/removed_at guard is present in both `layout.tsx` and `require-approver.ts` with `signOut` called before redirect. `homeTeamId`/`awayTeamId` have been removed from both the Zod schema and `ResultForm` payload with server-side fixture lookups in `createResult` and `updateResult`. The `lineup_players` RLS migration has symmetric player-squad checks in both `USING` and `WITH CHECK`. `proxy.ts` follows the correct Next.js 16 convention. Both security-reviewer report files are present.
