# Test Verification — Brief 22 — `brief-22-public-realtime`

**Branch:** `brief-22-public-realtime`
**Date:** 2026-05-17
**Verifier:** test-verifier agent
**Model:** claude-sonnet-4-6

---

## Status Table

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| AC-1 | `REVOKE ALL ON public.fixtures FROM anon` in `20260512120000_public_views.sql`; `security_invoker = false` appears 3 times | ✅ Met | Line 112: `REVOKE ALL ON public.fixtures FROM anon`; lines 21, 50, 79: `WITH (security_invoker = false)` |
| AC-2 | No pre-existing `FOR SELECT TO anon` policies on fixtures/results/goals/cards before `20260517112234` | ✅ Met | grep across all prior migrations returned no matches |
| AC-3 | `is_kickstart_competition` did not exist before `20260517112234` | ✅ Met | grep across all prior migrations returned no matches |
| AC-4 | No prior migration creates `supabase_realtime` publication | ✅ Met | grep for `CREATE PUBLICATION supabase_realtime` in prior migrations returned no matches |
| AC-5 | `src/lib/supabase/client.ts` exists and exports `createBrowserClient()` wrapping `@supabase/ssr` | ✅ Met | File exists; exports `createBrowserClient()` calling `createSSRBrowserClient` from `@supabase/ssr` |
| AC-6 | Primary migration has exactly one `BEGIN;` and one `COMMIT;` | ✅ Met | Lines 28 and 131 of `20260517112234_public_realtime.sql` |
| AC-7 | Function has `SECURITY DEFINER`, `STABLE`, `SET search_path = public` | ✅ Met | Lines 39–41: `STABLE`, `SECURITY DEFINER`, `SET search_path = public` |
| AC-8 | Function body does not reference `auth.uid()` | ✅ Met | Function body (lines 42–48) contains no `auth.uid()` |
| AC-9 | Function queries `competition_teams.is_kickstart`, no join to `squads` | ✅ Met | Lines 43–47: `FROM public.competition_teams ct WHERE ct.competition_id = p_competition_id AND ct.is_kickstart = true`; no `squads` reference |
| AC-10 | `GRANT EXECUTE ON FUNCTION public.is_kickstart_competition(uuid) TO anon` present | ✅ Met | Line 51 of `20260517112234_public_realtime.sql` |
| AC-11 | `GRANT SELECT` on all 4 tables to anon | ✅ Met | Lines 59–62: fixtures, results, goals, cards |
| AC-12 | `fixtures_anon_select` USING clause is `USING (is_kickstart_competition(competition_id))` with no EXISTS wrapper | ✅ Met | Lines 71–75: `USING (is_kickstart_competition(competition_id));` |
| AC-13 | `results_anon_select` USING clause joins `fixtures` and calls `is_kickstart_competition(f.competition_id)` | ✅ Met | Both in primary (lines 83–88) and fixup migration (lines 19–29); fixup is authoritative DB state |
| AC-14 | `goals_anon_select` USING clause joins through `results` to `fixtures` and calls `is_kickstart_competition(f.competition_id)` | ✅ Met | Both in primary (lines 96–103) and fixup (lines 31–44); fixup is authoritative DB state |
| AC-15 | `cards_anon_select` USING clause joins `fixtures` and calls `is_kickstart_competition(f.competition_id)` | ✅ Met | Both in primary (lines 109–116) and fixup (lines 46–57); fixup is authoritative DB state |
| AC-16 | `ALTER PUBLICATION supabase_realtime ADD TABLE` for all 4 tables | ✅ Met | Lines 126–129 of `20260517112234_public_realtime.sql` |
| AC-17 | Neither migration contains `user_accessible_squads` as DDL subject | ✅ Met | Neither migration file contains the string `user_accessible_squads` |
| AC-18 | Neither migration contains `profiles_select` as DDL subject | ✅ Met | Neither migration file contains the string `profiles_select` |
| AC-19 | `RealtimePublicRefresh.tsx` exists with `"use client"` directive | ✅ Met | File exists at correct path; line 1 is `"use client";` |
| AC-20 | Component subscribes to all 4 tables | ✅ Met | Lines 36–39: `.on("postgres_changes", ..., table: "fixtures", ...)`, `table: "results"`, `table: "goals"`, `table: "cards"` |
| AC-21 | Component handles `visibilitychange` lifecycle correctly | ✅ Met | Lines 50–58: on `visible` calls `subscribe()` then `router.refresh()`; on `hidden` calls `unsubscribe()`. Lines 67–68: cleanup removes listener and calls `unsubscribe()` |
| AC-22 | Component returns `null` | ✅ Met | Line 73: `return null;` |
| AC-23 | `<RealtimePublicRefresh />` is first child of top-level `<div>` in all three pages | ✅ Met | **fixtures/page.tsx**: first child of `<div>` (both return paths). **standings/page.tsx**: first child of `<div>`. **results/page.tsx**: first child of `<div>` in both the early-return (empty results) path and the non-empty path (fixed in commit e96c978) |

---

## Detail Section

### AC-1 — REVOKE on fixtures + security_invoker count

`supabase/migrations/20260512120000_public_views.sql` line 112:
```sql
REVOKE ALL ON public.fixtures           FROM anon;
```
`WITH (security_invoker = false)` appears exactly 3 times (one per view).

---

### AC-2 — No pre-existing anon SELECT policies on 4 tables

`grep -rn "FOR SELECT TO anon" <all migrations before 20260517112234> | grep -iE "fixtures|results|goals|cards"` — returned zero results.

---

### AC-3 — `is_kickstart_competition` did not previously exist

`grep -rn "is_kickstart_competition" <all migrations before 20260517112234>` — returned zero results.

---

### AC-4 — No prior `CREATE PUBLICATION supabase_realtime`

`grep -rn "CREATE PUBLICATION supabase_realtime" <all migrations before 20260517112234>` — returned zero results. Publication is Supabase-managed; only `ALTER PUBLICATION … ADD TABLE` appears in `20260517112234`.

---

### AC-5 — `src/lib/supabase/client.ts`

```ts
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

---

### AC-6 — Single BEGIN/COMMIT

`20260517112234_public_realtime.sql`:
- Line 28: `BEGIN;`
- Line 131: `COMMIT;`

One of each. All DDL between them.

---

### AC-7 — Function modifiers

Lines 39–41 of `20260517112234_public_realtime.sql`:
```sql
STABLE
SECURITY DEFINER
SET search_path = public
```

---

### AC-8 — No `auth.uid()` in function body

Lines 42–48 of `20260517112234_public_realtime.sql`:
```sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_teams ct
    WHERE ct.competition_id = p_competition_id
      AND ct.is_kickstart = true
  );
$$;
```
No `auth.uid()`.

---

### AC-9 — Queries `competition_teams`, no `squads`

Function body reads only from `public.competition_teams ct`. No mention of `squads`.

---

### AC-10 — GRANT EXECUTE

Line 51 of `20260517112234_public_realtime.sql`:
```sql
GRANT EXECUTE ON FUNCTION public.is_kickstart_competition(uuid) TO anon;
```

---

### AC-11 — GRANT SELECT on 4 tables

Lines 59–62 of `20260517112234_public_realtime.sql`:
```sql
GRANT SELECT ON public.fixtures TO anon;
GRANT SELECT ON public.results  TO anon;
GRANT SELECT ON public.goals    TO anon;
GRANT SELECT ON public.cards    TO anon;
```

---

### AC-12 — `fixtures_anon_select` USING clause

Lines 71–75 of `20260517112234_public_realtime.sql`:
```sql
CREATE POLICY fixtures_anon_select
  ON public.fixtures
  FOR SELECT
  TO anon
  USING (is_kickstart_competition(competition_id));
```
No EXISTS wrapper. Direct call.

---

### AC-13 — `results_anon_select`

Final authoritative version (fixup migration `20260517113131`, lines 19–29):
```sql
CREATE POLICY results_anon_select
  ON public.results
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.fixtures f
      WHERE f.id = results.fixture_id
        AND is_kickstart_competition(f.competition_id)
    )
  );
```

---

### AC-14 — `goals_anon_select`

Final authoritative version (fixup migration `20260517113131`, lines 31–44):
```sql
CREATE POLICY goals_anon_select
  ON public.goals
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.results r
      JOIN public.fixtures f ON f.id = r.fixture_id
      WHERE r.id = goals.result_id
        AND is_kickstart_competition(f.competition_id)
    )
  );
```

---

### AC-15 — `cards_anon_select`

Final authoritative version (fixup migration `20260517113131`, lines 46–57):
```sql
CREATE POLICY cards_anon_select
  ON public.cards
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.fixtures f
      WHERE f.id = cards.fixture_id
        AND is_kickstart_competition(f.competition_id)
    )
  );
```

---

### AC-16 — ALTER PUBLICATION

Lines 126–129 of `20260517112234_public_realtime.sql`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
```

---

### AC-17 — `user_accessible_squads` untouched

Neither `20260517112234_public_realtime.sql` nor `20260517113131_fix_public_realtime_policies.sql` contains `user_accessible_squads`.

---

### AC-18 — `profiles_select` untouched

Neither migration file contains `profiles_select`.

---

### AC-19 — Component file and directive

`src/features/public-realtime/RealtimePublicRefresh.tsx` exists. Line 1: `"use client";`.

---

### AC-20 — Subscribes to all 4 tables

Lines 36–39 of `RealtimePublicRefresh.tsx`:
```tsx
.on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => router.refresh())
.on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => router.refresh())
.on("postgres_changes", { event: "*", schema: "public", table: "goals" }, () => router.refresh())
.on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => router.refresh())
```

---

### AC-21 — visibilitychange lifecycle

```tsx
function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    subscribe();
    router.refresh();
  } else {
    unsubscribe();
  }
}
```
Cleanup removes listener and calls `unsubscribe()`. All three required behaviors present.

---

### AC-22 — Returns null

Line 73: `return null;`

---

### AC-23 — First child placement — PASS

**fixtures/page.tsx** (line 65): `<RealtimePublicRefresh />` is first child of `<div>` at line 63. Met.

**standings/page.tsx** (line 148): `<RealtimePublicRefresh />` is first child of `<div>`. Met.

**results/page.tsx**: Two return statements. Both now have `<RealtimePublicRefresh />` as first child:
- Early-return path (empty results): `<RealtimePublicRefresh />` added as first child (commit e96c978)
- Non-empty path: `<RealtimePublicRefresh />` was first child from initial implementation

---

## Summary

| Category | Count |
|---|---|
| Met | 23 |
| Missing | 0 |
| Partial/Unverifiable | 0 |
| Ambiguous | 0 |

**All 23 criteria met. Branch is clear to merge.**

Note: The fixup migration (`20260517113131`) is intentional — the initial migration was applied to the remote DB before Critical security findings were caught; the fixup corrects the three child-table policies. AC-13, AC-14, AC-15 are satisfied by the fixup's authoritative DB state.
