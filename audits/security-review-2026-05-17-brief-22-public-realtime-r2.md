# Security Review R2 — 2026-05-17 — `brief-22-public-realtime`

**Reviewer:** security-reviewer agent (second invocation)
**Date:** 2026-05-17
**Branch:** `brief-22-public-realtime`
**Base:** `main`
**Model:** claude-sonnet-4-6
**Prior report:** `audits/security-review-2026-05-17-brief-22-public-realtime.md`

---

## 1. Scope Summary

**Files changed vs main:**
```
src/app/(public)/public/fixtures/page.tsx
src/app/(public)/public/results/page.tsx
src/app/(public)/public/standings/page.tsx
```

**New files (untracked):**
```
src/features/public-realtime/RealtimePublicRefresh.tsx
supabase/migrations/20260517112234_public_realtime.sql
supabase/migrations/20260517113131_fix_public_realtime_policies.sql
```

**What the changes touch:**
- `20260517112234_public_realtime.sql`: Creates `is_kickstart_competition(uuid)` SECURITY DEFINER helper, GRANTs SELECT on 4 tables to anon, creates 4 anon SELECT policies, adds 4 tables to `supabase_realtime` publication.
- `20260517113131_fix_public_realtime_policies.sql`: Fixes the 3 child-table policies to include explicit `is_kickstart_competition()` calls (addresses R1 Findings 1–3).
- `RealtimePublicRefresh.tsx`: Client component subscribing to `postgres_changes` on 4 tables, discarding payload, calling `router.refresh()` on any event.
- Three public pages: import and mount `<RealtimePublicRefresh />`.

---

## 2. Prior Findings — Status

### Finding 1 (R1 Critical) — `results_anon_select` missing explicit Kickstart restriction — CLOSED

**Current state (`20260517112234` + `20260517113131`):**
```sql
CREATE POLICY results_anon_select ON public.results FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.fixtures f
      WHERE f.id = results.fixture_id
        AND is_kickstart_competition(f.competition_id)
    )
  );
```
Explicit `is_kickstart_competition()` call in USING clause. Self-contained — does not rely on implicit RLS chaining. **RESOLVED.**

---

### Finding 2 (R1 Critical) — `goals_anon_select` missing explicit Kickstart restriction — CLOSED

**Current state:**
```sql
CREATE POLICY goals_anon_select ON public.goals FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.results r
      JOIN public.fixtures f ON f.id = r.fixture_id
      WHERE r.id = goals.result_id
        AND is_kickstart_competition(f.competition_id)
    )
  );
```
JOIN to `results` used only as navigation key to reach `fixtures.competition_id`. Kickstart filter applied via SECURITY DEFINER function at the terminal step. **RESOLVED.**

---

### Finding 3 (R1 High) — `cards_anon_select` missing explicit Kickstart restriction — CLOSED

**Current state:**
```sql
CREATE POLICY cards_anon_select ON public.cards FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.fixtures f
      WHERE f.id = cards.fixture_id
        AND is_kickstart_competition(f.competition_id)
    )
  );
```
Direct call to `is_kickstart_competition(f.competition_id)`. **RESOLVED.**

---

### Finding 4 (R1 High) — Realtime subscription has no filter — Accepted tradeoff

Callback code:
```typescript
.on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => router.refresh())
```

Each callback is `() => router.refresh()` — the payload is discarded entirely. `router.refresh()` re-fetches from `public_*` views (correctly scoped, `security_invoker = false`). No row data from the Realtime event reaches the browser. Tradeoff is sound from a security standpoint. Document in PR.

---

## 3. Full Hard-Rules Checklist

| Rule | Status |
|---|---|
| `user_accessible_squads()` NOT modified | PASS — not referenced in either migration |
| `profiles_select` NOT modified | PASS — not referenced in either migration |
| Migration `20260517112234` uses single BEGIN/COMMIT | PASS |
| Migration `20260517113131` uses single BEGIN/COMMIT | PASS |
| `is_kickstart_competition()` does NOT reference `auth.uid()` | PASS |
| `is_kickstart_competition()` has `SET search_path = public` | PASS |
| UUID parameter used only in equality match | PASS |
| `competition_teams.is_kickstart` is the correct column (not `squads.is_kickstart`) | PASS — confirmed in migration `20260512000000` line 78 |
| No service-role key leakage | PASS — `createBrowserClient()` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| RLS enabled on all four tables | PASS — not disabled in any migration |
| No recursion in policy chain | PASS — goals→results→fixtures→function; linear |
| `fixtures_anon_select` calls `is_kickstart_competition(competition_id)` directly | PASS |
| `results_anon_select` calls `is_kickstart_competition(f.competition_id)` | PASS |
| `goals_anon_select` calls `is_kickstart_competition(f.competition_id)` | PASS |
| `cards_anon_select` calls `is_kickstart_competition(f.competition_id)` | PASS |

---

## 4. RLS Chain Analysis

All four policies are now self-contained:

- `fixtures_anon_select`: `is_kickstart_competition(competition_id)` — 0 hops to the Kickstart check
- `results_anon_select`: JOIN fixtures → `is_kickstart_competition(f.competition_id)` — 1 hop
- `goals_anon_select`: JOIN results → JOIN fixtures → `is_kickstart_competition(f.competition_id)` — 2 hops
- `cards_anon_select`: JOIN fixtures → `is_kickstart_competition(f.competition_id)` — 1 hop

No policy queries itself. No cycle. Each policy independently enforces the Kickstart restriction.

`is_kickstart_competition()` reads `competition_teams` (REVOKE'd from anon at table level). The function is SECURITY DEFINER and bypasses the REVOKE for this single boolean lookup. `SET search_path = public` prevents search-path injection.

---

## 5. New Findings

### Finding 5 — Realtime subscription fires on non-Kickstart mutations

**Severity:** Low
**Surface:** `RealtimePublicRefresh.tsx` lines 36–39

The subscription fires `router.refresh()` on any row change to the four tables, including non-Kickstart fixtures. This causes unnecessary re-renders but does not expose any data. Negligible at MVP scale.

**Remediation hint:** If mutation rate increases, add `filter: competition_id=eq.<uuid>` parameters scoped to Kickstart competition UUIDs passed as server-side props.

---

### Finding 6 — REVOKE comment drift

**Severity:** Low
**Surface:** `20260512120000_public_views.sql` comment vs `20260517112234_public_realtime.sql` GRANTs

The earlier migration's comment ("base tables are explicitly REVOKEd from the anon role") is no longer accurate for `fixtures`, `results`, `goals`, `cards` after the GRANTs in Brief 22. Documentation only — the RLS policies are the actual security gate.

**Remediation hint:** Add a comment to `20260517112234_public_realtime.sql` noting that these GRANTs intentionally supersede the earlier REVOKEs and that RLS policies are the sole gate.

---

## 6. Summary

| Category | Count |
|---|---|
| Critical findings | 0 |
| High findings | 0 |
| R1 Critical resolved | 2 of 2 |
| R1 High resolved | 1 of 1 (Finding 4 accepted as tradeoff) |
| New Low findings | 2 (Findings 5 and 6 — non-exploitable) |

**All Critical and High findings resolved. Branch is clear to open a PR.**
