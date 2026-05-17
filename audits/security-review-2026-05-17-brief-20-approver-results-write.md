# Security Review — 2026-05-17 — `brief-20-approver-results-write`

**Reviewer:** security-reviewer agent
**Date:** 2026-05-17
**Branch:** `brief-20-approver-results-write`
**Base:** `main`
**Model:** claude-sonnet-4-6

---

## 1. Scope Summary

**Branch vs main:** Single new file in the working tree:

```
supabase/migrations/20260517030953_results_goals_cards_approver_write.sql
```

No code files (routes, actions, components, lib) modified. The migration drops and recreates three RLS policies — `results_active_squad`, `goals_active_squad`, `cards_active_squad` — inside a single `BEGIN;/COMMIT;` transaction. Each recreated policy adds an `OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true AND status = 'active' AND removed_at IS NULL)` clause to both `USING` and `WITH CHECK`, widening write access for active approvers on the `results`, `goals`, and `cards` tables.

---

## 2. Findings

### Finding 1 — Approver bypass correctly scoped with status + removed_at defence-in-depth

**Severity:** Low (observation, not a defect — intentional widening per Brief 20 design)
**Surface:** `supabase/migrations/20260517030953_results_goals_cards_approver_write.sql`, both USING and WITH CHECK clauses for all three policies

**Verbatim evidence (structure repeated for results, goals, and cards):**
```sql
OR EXISTS (
  SELECT 1 FROM public.profiles
  WHERE  id = auth.uid()
    AND  is_approver = true
    AND  status = 'active'
    AND  removed_at IS NULL
)
```

**Why this matters:** Intentional per Brief 20. The OR clause only adds a path; it does not remove or narrow the existing squad-scoped path. Non-approver coaches remain fully scoped to their own squads. The `status = 'active' AND removed_at IS NULL` guards are the Brief 19 defence-in-depth convention applied correctly here.

**Remediation hint:** No action required. Consider a follow-on migration to backfill `status = 'active' AND removed_at IS NULL` into the older approver bypass clauses on `squads`, `competitions`, `competition_teams`, `profile_teams`, `access_requests`, and `access_request_teams` for consistency (see Finding 2).

---

### Finding 2 — Pre-existing inconsistency: older approver policies lack status/removed_at guards

**Severity:** Medium (pre-existing, not introduced by this branch)
**Surface:** `supabase/migrations/20260513010000_user_model_phase_b.sql`, approver clauses on squads, competitions, competition_teams, profile_teams, access_requests, access_request_teams

**Verbatim evidence (representative sample):**
```sql
EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approver = true)
```

**Why this matters:** The new migration correctly uses `AND status = 'active' AND removed_at IS NULL`. All pre-existing approver-only write policies only check `is_approver = true`. Not exploitable today given the auth-layer ban enforcement in the suspend/remove flows, but the inconsistency creates a fragile pattern for future changes.

**Remediation hint:** Follow-on migration to add `AND status = 'active' AND removed_at IS NULL` to the approver clauses on the older tables listed above.

---

## 3. Hard-Rules Checklist

| Rule | Result |
|---|---|
| 1. `user_accessible_squads()` function not modified | PASS — no function DDL in migration; appears only as a callee |
| 2. `profiles_select` policy not modified | PASS — not referenced in migration |
| 3. `match_fees`, `lineups`, `lineup_players`, `fixtures` policies not modified | PASS — no DROP/CREATE POLICY for these tables |
| 4. Single `BEGIN;/COMMIT;` block | PASS — exactly one `BEGIN;` and one `COMMIT;` |
| 5. Approver bypass includes `status = 'active' AND removed_at IS NULL` | PASS — all six OR clauses include both guards verbatim |
| 6. OR clauses only widen, do not narrow existing path | PASS — existing squad-scoped EXISTS subqueries reproduced verbatim; OR clause is additive |
| 7. No service-role key leakage | PASS — no code files changed |
| 8. RLS still enabled on all three tables | PASS — no `DISABLE ROW LEVEL SECURITY` in migration |

---

## 4. RLS Recursion Risk Assessment

The new OR clause reads `public.profiles` with `WHERE id = auth.uid()`. This triggers `profiles_select` (`auth.uid() = id`), which evaluates without reading `profiles` again. No recursive RLS cycle is introduced. This is the same pattern used in 22 places across existing policies — all deployed and working.

---

## 5. Summary

| # | Severity | Title |
|---|---|---|
| 1 | Low | Intentional approver write widening — correct per Brief 20 design |
| 2 | Medium (pre-existing) | Older approver policies lack `status`/`removed_at` guards |

**Critical findings: 0**
**High findings: 0**
**New Medium findings: 0** (Finding 2 is pre-existing, not introduced by this branch)
**New Low findings: 1** (Finding 1 — intentional, expected per Brief 20 design)

All eight hard rules pass. Branch is clear to proceed to PR.
