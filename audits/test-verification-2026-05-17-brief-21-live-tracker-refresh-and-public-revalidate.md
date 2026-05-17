# Test Verification — Brief 21: Live tracker re-fetch on visible + public route revalidation

| Field | Value |
|---|---|
| **Branch** | `brief-21-live-tracker-refresh-and-public-revalidate` |
| **Date** | 2026-05-17 |
| **Verifier** | Claude Code (acceptance-criteria verifier) |
| **Model** | claude-sonnet-4-6 |
| **Criteria total** | 17 |

---

## Status Table

| # | Criterion | Status | Evidence |
|---|---|---|---|
| AC-1 | No pre-existing visibilitychange/pageshow handler; tick-clock and outside-click effects still present | ✅ Met | See detail |
| AC-2 | New `visibilitychange` useEffect calling `router.refresh()` when state is `"visible"` | ✅ Met | Lines 177–185 of LiveMatchTracker.tsx |
| AC-3 | Cleanup function removes the visibilitychange listener | ✅ Met | Line 184 of LiveMatchTracker.tsx |
| AC-4 | Inspection: live-match actions had no pre-existing `/public/*` revalidation | ✅ Met | git diff shows only additions; no `/public/` lines removed |
| AC-5 | `revalidatePublic()` helper in live-match actions.ts with all three paths | ✅ Met | Lines 25–29 of live-match/actions.ts |
| AC-6 | All 9 live-match mutation functions call `revalidatePublic()` | ✅ Met | See detail — all 9 confirmed |
| AC-7 | Inspection: results actions had no pre-existing `/public/*` revalidation | ✅ Met | git diff shows only additions; no `/public/` lines removed |
| AC-8 | `revalidatePublic()` helper in results/actions.ts with all three paths | ✅ Met | Lines 35–39 of results/actions.ts |
| AC-9 | `createResult` calls `revalidatePublic()` before redirect | ✅ Met | Lines 143–144 of results/actions.ts |
| AC-10 | `updateResult` calls `revalidatePublic()` before redirect | ✅ Met | Lines 243–244 of results/actions.ts |
| AC-11 | `deleteResult` calls `revalidatePublic()` before redirect | ✅ Met | Lines 264–265 of results/actions.ts |
| AC-12 | No existing internal `revalidatePath` calls removed | ✅ Met | git diff shows only `+` lines for revalidatePublic(); all existing paths untouched |
| AC-13 | No new dependencies added | ✅ Met | `git diff main -- package.json package-lock.json` produced no output |
| AC-14 | No migrations created | ✅ Met | `git diff main --name-only -- supabase/migrations/` produced no output |
| AC-15 | `npm run typecheck` exits 0 | ✅ Met | `tsc --noEmit` completed with no output |
| AC-16 | `npm run lint` exits 0 | ✅ Met | `eslint` completed with no output |
| AC-17 | Test-verifier report present | ✅ Met | This file |

---

## Detail

### AC-1 — No pre-existing visibilitychange/pageshow handler; pre-existing effects intact

The git diff on `LiveMatchTracker.tsx` shows the new `useEffect` block was inserted as a pure addition between the tick-clock effect and the outside-click effect. No existing effects were removed or modified.

Pre-existing tick-clock effect (lines 166–171, unchanged):
```tsx
useEffect(() => {
  const live = ["h1", "h1_stoppage", "h2", "h2_stoppage"].includes(matchState ?? "");
  if (!live) return;
  const id = setInterval(() => setTick((n) => n + 1), 15_000);
  return () => clearInterval(id);
}, [matchState]);
```

Pre-existing outside-click effect (lines 188–196, unchanged):
```tsx
useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
      setPickerOpen(false);
    }
  }
  if (pickerOpen) document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, [pickerOpen]);
```

No `pageshow` or pre-existing `visibilitychange` handler found anywhere in the file before this branch (git diff shows only additions, no removals of any such handler).

---

### AC-2 — New `visibilitychange` useEffect

`src/features/live-match/LiveMatchTracker.tsx` lines 177–185:
```tsx
useEffect(() => {
  function onVisible() {
    if (document.visibilityState === "visible") {
      router.refresh();
    }
  }
  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
}, [router]);
```

Condition `document.visibilityState === "visible"` is present. `router.refresh()` is called inside.

---

### AC-3 — Cleanup removes listener

Line 184 of LiveMatchTracker.tsx (same block as AC-2):
```tsx
return () => document.removeEventListener("visibilitychange", onVisible);
```

Cleanup function references the same `onVisible` function used in `addEventListener`.

---

### AC-4 — live-match actions had no pre-existing `/public/*` revalidation

Full git diff of `src/features/live-match/actions.ts` shows only `+` (added) lines for the `revalidatePublic` function and its call sites. The diff contains zero `-` (removed) lines touching `revalidatePath`. Confirmed: no `/public/` paths existed before this branch.

---

### AC-5 — `revalidatePublic()` helper in live-match/actions.ts

`src/features/live-match/actions.ts` lines 25–29:
```ts
function revalidatePublic() {
  revalidatePath("/public/standings");
  revalidatePath("/public/fixtures");
  revalidatePath("/public/results");
}
```

All three required paths present.

---

### AC-6 — All 9 live-match mutation functions call `revalidatePublic()`

Verified by reading `src/features/live-match/actions.ts` and the git diff:

| Function | Line (call site) | Confirmed |
|---|---|---|
| `kickOff` | line 63 | yes |
| `setStoppage` | line 81 | yes |
| `endFirstHalf` | line 93 | yes |
| `startSecondHalf` | line 105 | yes |
| `endMatch` | line 149 | yes |
| `reopenMatch` | line 162 | yes |
| `logGoal` | line 199 | yes |
| `deleteGoal` | line 211 | yes |
| `updateGoal` | line 237 | yes |

All 9 functions confirmed. Each call is placed after the DB operation succeeds and before `return null`.

---

### AC-7 — results actions had no pre-existing `/public/*` revalidation

Full git diff of `src/features/results/actions.ts` shows only `+` (added) lines for the `revalidatePublic` function and its three call sites. Zero `-` (removed) lines touching `revalidatePath`. Confirmed: no `/public/` paths existed before this branch.

---

### AC-8 — `revalidatePublic()` helper in results/actions.ts

`src/features/results/actions.ts` lines 35–39:
```ts
function revalidatePublic() {
  revalidatePath("/public/standings");
  revalidatePath("/public/fixtures");
  revalidatePath("/public/results");
}
```

All three required paths present.

---

### AC-9 — `createResult` calls `revalidatePublic()` before redirect

`src/features/results/actions.ts` lines 140–144:
```ts
revalidatePath(`/fixtures/${fixtureId}/result`);
revalidatePath("/fixtures");
revalidatePath("/standings");
revalidatePublic();
redirect(`/fixtures/${fixtureId}/result`);
```

`revalidatePublic()` is called on line 143, `redirect(...)` on line 144. Order is correct.

---

### AC-10 — `updateResult` calls `revalidatePublic()` before redirect

`src/features/results/actions.ts` lines 240–244:
```ts
revalidatePath(`/fixtures/${fixtureId}/result`);
revalidatePath("/fixtures");
revalidatePath("/standings");
revalidatePublic();
redirect(`/fixtures/${fixtureId}/result`);
```

`revalidatePublic()` on line 243, `redirect(...)` on line 244. Order is correct.

---

### AC-11 — `deleteResult` calls `revalidatePublic()` before redirect

`src/features/results/actions.ts` lines 261–265:
```ts
revalidatePath(`/fixtures/${fixtureId}/result`);
revalidatePath("/fixtures");
revalidatePath("/standings");
revalidatePublic();
redirect("/fixtures");
```

`revalidatePublic()` on line 264, `redirect(...)` on line 265. Order is correct.

---

### AC-12 — No existing internal `revalidatePath` calls removed

**live-match/actions.ts diff:** All `-` lines in the diff are exclusively context lines (prefixed with ` `, not `-`). The only `revalidatePath` removals would appear as `-` lines — none exist. Pre-existing paths `/fixtures/${fixtureId}/live` and `/fixtures/${fixtureId}/result` remain untouched.

**results/actions.ts diff:** Same pattern — no `-` lines on any existing `revalidatePath(...)` call. Pre-existing paths `/fixtures/${fixtureId}/result`, `/fixtures`, and `/standings` all remain.

---

### AC-13 — No new dependencies added

```
git diff main -- package.json package-lock.json yarn.lock
```
Produced no output. Package files are byte-for-byte identical to main.

---

### AC-14 — No migrations created

```
git diff main --name-only -- supabase/migrations/
```
Produced no output. No migration files added or modified.

---

### AC-15 — typecheck passes

```
npm run typecheck
> tsc --noEmit
```
Exited 0 with no error output.

---

### AC-16 — lint passes

```
npm run lint
> eslint
```
Exited 0 with no error output.

---

### AC-17 — Report present

This file: `audits/test-verification-2026-05-17-brief-21-live-tracker-refresh-and-public-revalidate.md`

---

## Summary

| Result | Count |
|---|---|
| Met | 17 |
| Not Met | 0 |
| Unverifiable statically | 0 |
| Ambiguous | 0 |

**Recommendation: Ready for PR.** All 17 acceptance criteria are met. The three files changed match exactly what the brief described, no regressions are introduced to existing revalidation paths, no dependencies or migrations are added, and both typecheck and lint pass clean. Runtime verification of preview tests A–C (bfcache fix, public page invalidation, regression) should be completed by the owner on the Vercel preview before merging, per the brief's notes.
