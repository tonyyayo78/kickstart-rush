# Security Review — Brief 28.5: grant_owner_access_to_brief_25_squads
**Date:** 2026-05-17
**Scope:** `supabase/migrations/20260517214730_grant_owner_access_to_brief_25_squads.sql`

## Summary

The migration is a data-only seed (INSERT into `public.profile_teams`). No RLS policies, functions, grants, or views are modified.

**Verdict: SAFE. 0 Critical, 0 High findings.**

---

## Findings

| # | Severity | Title |
|---|----------|-------|
| 1 | Pass | Migration is data-only — no RLS/function surface changed |
| 2 | Pass | Email + status filter restricts to owner only; non-owner bypass not possible |
| 3 | Pass | Superuser authority bypass is intended; identical to phase_a canonical seed |
| 4 | Pass | ON CONFLICT idempotency backed by UNIQUE (profile_id, squad_id) constraint |
| 5 | Pass | Post-migration exposure limited to Kickstart-participated fixtures/players |
| 6 | Low | `AND p.status = 'active'` guard: tighter than phase_a but silent no-op if owner not yet active (unreachable in current deployment) |
| 7 | Medium (pre-existing) | `proxy.ts` does not check `status`/`removed_at`; `(app)/layout.tsx` is the sole gate — not introduced by this migration |

---

## Detail

### 1 — Data-only migration

```sql
BEGIN;
INSERT INTO public.profile_teams (profile_id, squad_id)
SELECT p.id, s.id
FROM   public.profiles p
CROSS  JOIN public.squads s
WHERE  p.email = 'alythcott@gmail.com'
  AND  p.status = 'active'
ON CONFLICT (profile_id, squad_id) DO NOTHING;
COMMIT;
```

No `CREATE OR REPLACE FUNCTION`, `DROP POLICY`, `CREATE POLICY`, `ALTER TABLE`, `GRANT`, or `REVOKE`. `user_accessible_squads()` and `profiles_select` are not touched. **PASS.**

### 2 — Owner-only filter

`WHERE p.email = 'alythcott@gmail.com' AND p.status = 'active'` is a string literal; not parameterised. The addition of `AND p.status = 'active'` is strictly tighter than the canonical phase_a seed (which lacks that guard). No other profile rows are reachable. **PASS.**

### 3 — Superuser bypass

Migrations execute as the `postgres` superuser, which bypasses RLS by design. Identical authority to the original `user_model_phase_a` seed at lines 124–129. No new authority introduced. **PASS.**

### 4 — Idempotency

`UNIQUE (profile_id, squad_id)` confirmed at `user_model_phase_a.sql` line 27. `ON CONFLICT (profile_id, squad_id) DO NOTHING` is valid; running the migration twice produces no error and no duplicate rows. **PASS.**

### 5 — Post-migration data exposure

Owner gains visibility of fixtures/players/results/goals/fees for Kickstart squads via `user_accessible_squads()`. Non-Kickstart club data is not stored in player/fees tables (those tables are squad-scoped to Kickstart). No private third-party data is exposed. **PASS.**

### 6 — Silent no-op risk (Low)

If the owner profile has `status != 'active'` when this migration runs, the INSERT produces zero rows — a silent no-op rather than an error. In the current deployment `status = 'active'` is invariant for the owner, so this branch is unreachable. The phase_a pattern (safety check before the seed) could be mirrored if hardening is desired. **Low — not a blocker.**

### 7 — proxy.ts status check (Medium, pre-existing)

`src/proxy.ts` checks only for authenticated session presence (`!user`). A suspended/removed user with a valid session cookie passes the proxy and is blocked at `(app)/layout.tsx` (line 29). This single-layer defence is a pre-existing condition, unchanged by this migration. **Medium — pre-existing, not introduced here.**
