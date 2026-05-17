# Test Verification — Brief 28: App Filter and Ordering

**Branch:** `brief-28-app-filter-and-ordering`
**Date:** 2026-05-17
**Criteria total:** 18 (criteria A–J marked Unverifiable require a live browser; static criteria 1–18 verified here)

---

## Per-Criterion Status Table

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `compareCompetitionCode` exported from `age-filter.ts` | ✅ Met | `export function compareCompetitionCode(a: string, b: string): number` at line 100 |
| 2 | `compareCompetitionCode("BFA-2026-U9-A", "BFA-2026-U9-B")` returns negative | ✅ Met | Node trace: `-1` |
| 3 | `compareCompetitionCode("BFA-2026-U13-A", "BFA-U15-2026-ZA")` returns negative | ✅ Met | Node trace: `-1` |
| 4 | `compareCompetitionCode("BFA-2026-U17", "BFA-U15-2026-ZB")` returns positive | ✅ Met | Node trace: `1` |
| 5 | `(app)/fixtures/page.tsx` reads `searchParams.age` via `parseAgeParam` | ✅ Met | Lines 5–8 import `parseAgeParam`; lines 61–62 `const { age } = await searchParams; const filter = parseAgeParam(age);` |
| 6 | `(app)/fixtures/page.tsx` mounts `<AgeFilterPills />` inside `<Suspense>` | ✅ Met | Lines 90–92: `<Suspense><AgeFilterPills /></Suspense>` |
| 7 | `(app)/fixtures/page.tsx` filters fixtures by age group | ✅ Met | Lines 73–74: `.filter((f) => matchesAgeFilter(f.competition.code, filter))` |
| 8 | `(app)/standings/page.tsx` reads `searchParams.age` via `parseAgeParam` | ✅ Met | Lines 4–8 import `parseAgeParam`; lines 30–31 `const { age } = await searchParams; const filter = parseAgeParam(age);` |
| 9 | `(app)/standings/page.tsx` mounts `<AgeFilterPills />` | ✅ Met | Lines 61–63: `<Suspense><AgeFilterPills /></Suspense>` |
| 10 | `(app)/standings/page.tsx` sorts competitions by `compareCompetitionCode` | ✅ Met | Lines 50–52: `[...competitions.entries()].sort(([codeA], [codeB]) => compareCompetitionCode(codeA, codeB))` |
| 11 | `/public/fixtures/page.tsx` sorts `compGroups` by `compareCompetitionCode` | ✅ Met | Line 130: `[...compGroups.entries()].sort(([codeA], [codeB]) => compareCompetitionCode(codeA, codeB))` |
| 12 | `/public/standings/page.tsx` sorts `competitions` by `compareCompetitionCode` | ✅ Met | Line 299: `[...competitions.entries()].sort(([codeA], [codeB]) => compareCompetitionCode(codeA, codeB))` |
| 13 | `/public/standings/page.tsx` Last Match sort uses `compareCompetitionCode` — no inline `AGE_ORDER` constant | ✅ Met | Line 169: `.sort((a, b) => compareCompetitionCode(a.competition_code, b.competition_code))`; grep for `AGE_ORDER` returns NOT FOUND |
| 14 | `AgeFilterPills.tsx` NOT modified on this branch | ✅ Met | `git diff main -- src/features/public-age-filter/AgeFilterPills.tsx` produces zero output |
| 15 | `user_accessible_squads` and `profiles_select` not in git diff | ✅ Met | `git diff main --name-only` grep for both names returns no output |
| 16 | No new migration files created | ✅ Met | `git diff main --name-only` returns no files under `supabase/migrations/` |
| 17 | `npm run typecheck` passes | ✅ Met | `tsc --noEmit` exits with no errors |
| 18 | `npm run lint` passes | ✅ Met | `eslint` exits with no errors |

---

## Detail Section

### Criterion 1 — `compareCompetitionCode` exported

File: `src/features/public-age-filter/age-filter.ts`, line 100:
```ts
export function compareCompetitionCode(a: string, b: string): number {
```

### Criteria 2–4 — Return value verification

Executed against the exact logic from `age-filter.ts` via Node:
```
Criterion 2 (U9-A vs U9-B):   -1   ✅ negative (same age, zone A < B)
Criterion 3 (U13-A vs U15-ZA): -1  ✅ negative (U13 ageRank=3 < U15 ageRank=4)
Criterion 4 (U17 vs U15-ZB):    1  ✅ positive (U17 ageRank=5 > U15 ageRank=4)
```

### Criterion 5 — `(app)/fixtures/page.tsx` reads `searchParams.age`

Lines 5–8:
```ts
import {
  parseAgeParam,
  matchesAgeFilter,
} from "@/features/public-age-filter/age-filter";
```
Lines 61–62:
```ts
const { age } = await searchParams;
const filter = parseAgeParam(age);
```

### Criterion 6 — `<AgeFilterPills />` inside `<Suspense>` in app fixtures

Lines 90–92:
```tsx
<Suspense>
  <AgeFilterPills />
</Suspense>
```

### Criterion 7 — Fixtures filtered by age group

Lines 73–74:
```ts
const fixtures = ((fixturesRaw ?? []) as unknown as FixtureRow[])
  .filter((f) => matchesAgeFilter(f.competition.code, filter));
```

### Criterion 8 — `(app)/standings/page.tsx` reads `searchParams.age`

Lines 30–31:
```ts
const { age } = await searchParams;
const filter = parseAgeParam(age);
```

### Criterion 9 — `<AgeFilterPills />` in app standings

Lines 61–63:
```tsx
<Suspense>
  <AgeFilterPills />
</Suspense>
```

### Criterion 10 — App standings sorts by `compareCompetitionCode`

Lines 50–52:
```ts
const orderedCompetitions = [...competitions.entries()].sort(([codeA], [codeB]) =>
  compareCompetitionCode(codeA, codeB)
);
```

### Criterion 11 — Public fixtures sorts `compGroups`

Line 130:
```ts
{[...compGroups.entries()].sort(([codeA], [codeB]) => compareCompetitionCode(codeA, codeB)).map(([code, cg]) => (
```

### Criterion 12 — Public standings sorts `competitions`

Line 299:
```ts
{[...competitions.entries()].sort(([codeA], [codeB]) => compareCompetitionCode(codeA, codeB)).map(([, comp]) => (
```

### Criterion 13 — Last Match uses `compareCompetitionCode`, no inline `AGE_ORDER`

Line 169:
```ts
.sort((a, b) => compareCompetitionCode(a.competition_code, b.competition_code));
```
Grep for `AGE_ORDER` in public standings page: no matches found.

### Criterion 14 — `AgeFilterPills.tsx` not modified

```
git diff main -- src/features/public-age-filter/AgeFilterPills.tsx
(no output — 0 lines)
```

### Criterion 15 — `user_accessible_squads` and `profiles_select` not in diff

```
git diff main --name-only | grep -E "(user_accessible_squads|profiles_select|migrations)"
(no output)
```

### Criterion 16 — No new migration files

```
git diff main --name-only | grep migrations
(no output)
```

### Criterion 17 — `npm run typecheck` passes

```
> tsc --noEmit
(exits 0, no errors)
```

### Criterion 18 — `npm run lint` passes

```
> eslint
(exits 0, no errors)
```

---

## Summary

| Status | Count |
|--------|-------|
| Met | 18 |
| Not Met | 0 |
| Unverifiable statically | 0 |
| Ambiguous | 0 |

**Recommendation: Ready for PR.** All 18 static criteria are met. Criteria A–J from the brief (preview/UI tests) require a live browser and are out of scope for static verification.
