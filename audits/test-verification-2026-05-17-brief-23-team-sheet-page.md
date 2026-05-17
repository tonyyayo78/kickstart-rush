# Test Verification — Brief 23: Printable Team Sheet Page

| Field | Value |
|---|---|
| Branch | `brief-23-team-sheet-page` |
| Base | `main` |
| Date | 2026-05-17 |
| Verifier | Claude Sonnet 4.6 (static analysis) |
| Criteria total | 21 |

---

## Status Table

| # | Criterion | Status | Evidence |
|---|---|---|---|
| AC-1 | Inspection checks 1–5 all pass | ✅ Met | See detail below |
| AC-2 | Migration adds `coach_name text` to `public.squads` | ✅ Met | `ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS coach_name text;` |
| AC-3 | Migration uses `ADD COLUMN IF NOT EXISTS` | ✅ Met | Verbatim in migration line 12 |
| AC-4 | Migration touches no policies, functions, or grants | ✅ Met | Only `ALTER TABLE` + `COMMENT ON` |
| AC-5 | No `user_accessible_squads` or `profiles_select` in changed files | ✅ Met | grep returned no matches |
| AC-6 | Three logo files present | ✅ Met | `bfa.png`, `kickstart.png`, `nyc.jpeg` confirmed in `public/team-sheet/` |
| AC-7 | New page at `src/app/(app)/fixtures/[id]/team-sheet/page.tsx` | ✅ Met | File exists and readable |
| AC-8 | `TeamSheet.tsx` — named export, correct props | ✅ Met | See detail below |
| AC-9 | `PrintButton.tsx` — `"use client"`, `onClick={() => window.print()}` | ✅ Met | Verbatim in file |
| AC-10 | Imports `Bebas_Neue`, `Manrope`, `JetBrains_Mono`; CSS variables applied | ✅ Met | See detail below |
| AC-11 | `@media print` hides `[data-app-chrome="true"]` and `main` padding | ✅ Met | Lines 427–435 of `TeamSheet.module.css` |
| AC-12 | `@media print` hides `.print-controls` | ✅ Met | Line 436–438 of `TeamSheet.module.css` |
| AC-13 | Empty-lineup state handled; TeamSheet pads to 11/9 rows; no crash | ✅ Met | See detail below |
| AC-14 | Non-Kickstart fixture returns 404 | ✅ Met | `notFound()` at line 80 when `!kickstartTeam?.is_kickstart` |
| AC-15 | `result/page.tsx` has Link to `/fixtures/${id}/team-sheet` labeled "Team Sheet →" | ✅ Met | Lines 243–248 of `result/page.tsx` |
| AC-16 | `npm run typecheck` passes | ✅ Met | `tsc --noEmit` exited with no errors |
| AC-17 | `npm run lint` passes | ✅ Met | `eslint` exited with no errors |
| AC-18 | Migration `20260517132542_squads_coach_name.sql` exists with correct content | ✅ Met | File verified in detail below |
| AC-19 | This report itself | ✅ Met | Report written |
| AC-20 | Preview Tests A–F | ⚠️ Unverifiable | Requires live browser / Vercel preview |
| AC-21 | File budget — changed files match expected set | ✅ Met | See detail below |

---

## Detail

### AC-1 — Inspection checks 1–5

**Check 1: `fixtures/[id]/` subdirectories**

```
fees  lineup  live  result  team-sheet
```

All five required subdirectories are present.

**Check 2: `lineup/page.tsx` references `lineup_players`**

```ts
// line 46
lineup_players: LineupPlayerRow[];
// line 101
"id, formation, lineup_players(player_id, role, position_label, slot_order)",
// line 148
savedPlayers={existingLineup?.lineup_players ?? []}
```

**Check 3: `coach_name` not present before migration `20260517132542`**

Grep for `coach_name` in all migrations excluding the target file returned no matches. The column is added by the target migration.

**Check 4: `layout.tsx` has `<header data-app-chrome="true">`**

```tsx
// line 61
<header data-app-chrome="true" className="flex items-center ...">
```

**Check 5: Lineup page uses Tailwind only; TeamSheet uses CSS module**

`lineup/page.tsx` contains no `import` of any `.module.css` file — all styling is Tailwind utility classes. `TeamSheet.tsx` imports `styles from "./TeamSheet.module.css"` (line 3) and uses `styles.*` throughout.

---

### AC-2 / AC-3 — Migration content

`supabase/migrations/20260517132542_squads_coach_name.sql` (lines 9–17):

```sql
BEGIN;

ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS coach_name text;

COMMENT ON COLUMN public.squads.coach_name IS
  'Display name of the squad''s head coach, used on printable team sheets. Nullable.';

COMMIT;
```

`ADD COLUMN IF NOT EXISTS` is present verbatim.

---

### AC-4 — Migration touches only ALTER TABLE and COMMENT ON

No `POLICY`, `FUNCTION`, `GRANT`, or any other DDL keyword present in the migration file. Confirmed by grep returning no output.

---

### AC-5 — No forbidden strings

Grep for `user_accessible_squads` and `profiles_select` across all changed files returned no matches.

---

### AC-6 — Logo files

```
public/team-sheet/bfa.png
public/team-sheet/kickstart.png
public/team-sheet/nyc.jpeg
```

All three present.

---

### AC-8 — TeamSheet named export and props

```ts
// line 71
export function TeamSheet({
  fixture,
  isHomeTeam,
  starters,
  subs,
  coachName,
  squadCode,
}: TeamSheetProps) {
```

`TeamSheetProps` type (lines 42–61) defines:
- `fixture`: object with `homeTeamName`, `awayTeamName`, `kickoffAt`, `venue`, `ageGroup`
- `isHomeTeam: boolean`
- `starters: Array<{ jerseyNumber: number | null; playerName: string }>`
- `subs: Array<{ jerseyNumber: number | null; playerName: string }>`
- `coachName: string | null`
- `squadCode: string`

All six required props are present.

---

### AC-9 — PrintButton

```ts
"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
```

`"use client"` directive on line 1; `onClick={() => window.print()}` on line 7.

---

### AC-10 — Google Fonts and CSS variables

```ts
// lines 2–20
import { Bebas_Neue, Manrope, JetBrains_Mono } from "next/font/google";

const bebas = Bebas_Neue({ ..., variable: "--font-bebas", ... });
const manrope = Manrope({ ..., variable: "--font-manrope", ... });
const mono = JetBrains_Mono({ ..., variable: "--font-mono", ... });
```

Applied at line 99:
```tsx
className={`${styles.sheet} ${bebas.variable} ${manrope.variable} ${mono.variable}`}
```

---

### AC-11 / AC-12 — Print media rules

`TeamSheet.module.css` lines 427–458:

```css
@media print {
  :global([data-app-chrome="true"]) {
    display: none !important;
  }

  :global(main) {
    padding: 0 !important;
  }

  :global(.print-controls) {
    display: none !important;
  }
  ...
}
```

AC-11: `[data-app-chrome="true"]` hidden and `main` padding zeroed.
AC-12: `.print-controls` hidden.

---

### AC-13 — Empty-lineup state

In `page.tsx` lines 94–110:
```ts
const lineupPlayers = lineup?.lineup_players ?? [];  // empty array when no lineup

const starters = lineupPlayers
  .filter((r) => r.role === "starter")
  ...
  .map(...);

const subs = lineupPlayers
  .filter((r) => r.role === "sub")
  ...
  .map(...);
```

When no lineup exists, `starters` and `subs` are empty arrays, passed directly to `TeamSheet`.

In `TeamSheet.tsx` lines 89–95:
```ts
const STARTER_ROWS = 11;
const SUB_ROWS = 9;

const starterRows = [...starters];
while (starterRows.length < STARTER_ROWS)
  starterRows.push({ jerseyNumber: null, playerName: "" });

const subRows = [...subs];
while (subRows.length < SUB_ROWS)
  subRows.push({ jerseyNumber: null, playerName: "" });
```

Empty arrays are padded to 11 starters and 9 subs. No crash possible on empty input.

---

### AC-14 — Non-Kickstart fixture returns 404

`page.tsx` line 78–80:
```ts
const kickstartTeam = isHomeKickstart ? fixture.home_team : fixture.away_team;

if (!kickstartTeam?.is_kickstart || !kickstartTeam.squad?.id) notFound();
```

If neither team has `is_kickstart === true`, the away_team is used and `is_kickstart` is false, so `notFound()` is called.

---

### AC-15 — Navigation link in result page

`result/page.tsx` lines 243–248:
```tsx
<Link
  href={`/fixtures/${id}/team-sheet`}
  className="text-xs font-medium text-[#00267F] hover:underline"
>
  Team Sheet →
</Link>
```

Label is exactly "Team Sheet →".

---

### AC-18 — Migration file exists with correct content

File `supabase/migrations/20260517132542_squads_coach_name.sql` exists. Content verified under AC-2/AC-3 above.

---

### AC-21 — File budget

`git diff --name-only main` output:

```
public/team-sheet/bfa.png
public/team-sheet/kickstart.png
public/team-sheet/nyc.jpeg
src/app/(app)/fixtures/[id]/result/page.tsx
src/app/(app)/fixtures/[id]/team-sheet/page.tsx
src/app/(app)/layout.tsx
src/features/team-sheet/PrintButton.tsx
src/features/team-sheet/TeamSheet.module.css
src/features/team-sheet/TeamSheet.tsx
supabase/migrations/20260517132542_squads_coach_name.sql
```

Expected files per the brief (10 total):
- `supabase/migrations/20260517132542_squads_coach_name.sql` — present
- `public/team-sheet/bfa.png` — present
- `public/team-sheet/nyc.jpeg` — present
- `public/team-sheet/kickstart.png` — present
- `src/app/(app)/fixtures/[id]/team-sheet/page.tsx` — present
- `src/features/team-sheet/TeamSheet.tsx` — present
- `src/features/team-sheet/TeamSheet.module.css` — present
- `src/features/team-sheet/PrintButton.tsx` — present
- `src/app/(app)/fixtures/[id]/result/page.tsx` — present
- `src/app/(app)/layout.tsx` — present

Exactly 10 files changed, matching the expected set with no extras.

---

## Summary

| Status | Count |
|---|---|
| Met | 20 |
| Not Met | 0 |
| Unverifiable (requires preview) | 1 |
| Ambiguous | 0 |

**Recommendation: Ready for PR.**

All statically verifiable criteria pass. The file budget is exact. `typecheck` and `lint` both pass clean. The single unverifiable criterion (AC-20) covers browser/print preview tests which are expected to be unverifiable at this stage.
