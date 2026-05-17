# Test Verification — Brief 28.5: Grant Owner Access to Brief-25 Squads

**Date:** 2026-05-17
**Branch:** brief-28-5-grant-owner-access-to-brief-25-squads
**Base:** main
**Criteria total:** 9

---

## Scope Summary

Brief 28.5 adds a single SQL migration that seeds `profile_teams` rows so the owner
(`alythcott@gmail.com`) gains visibility of the 8 Kickstart squads inserted by Brief 25.
The branch should contain exactly the migration file and no TypeScript changes.

---

## Status Table

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Migration file `20260517214730_grant_owner_access_to_brief_25_squads.sql` exists | Met | File present at `supabase/migrations/20260517214730_grant_owner_access_to_brief_25_squads.sql` |
| 2 | Migration contains a `BEGIN` and `COMMIT` (single transaction) | Met | Line 27: `BEGIN;` / Line 37: `COMMIT;` |
| 3 | INSERT-only with `ON CONFLICT DO NOTHING` — no ALTER TABLE, no CREATE POLICY, no GRANT | Met | SQL body is a single `INSERT ... ON CONFLICT (profile_id, squad_id) DO NOTHING`; grep for ALTER TABLE / CREATE POLICY / GRANT returns no SQL hits |
| 4 | Filter is `p.email = 'alythcott@gmail.com' AND p.status = 'active'` | Met | Lines 33–34 match exactly |
| 5 | Migration does not reference `user_accessible_squads` or `profiles_select` | Met | One occurrence of `user_accessible_squads` exists in a SQL comment (line 8); zero occurrences in SQL statements. `profiles_select` absent entirely. |
| 6 | `user_accessible_squads` and `profiles_select` do not appear in `git diff main` | Not Met | `audits/security-review-2026-05-17-brief-28-5-grant-owner-access-to-brief-25-squads.md` is part of the diff and contains both strings as prose text |
| 7 | No `.ts` / `.tsx` files modified on this branch | Met | `git diff main --name-only` lists only `.md` and `.sql` files |
| 8 | `npm run typecheck` passes | Met | Command exited 0 with no output |
| 9 | `npm run lint` passes | Met | Command exited 0 with no output |

---

## Detail

### Criterion 1 — Migration file exists

```
$ ls supabase/migrations/ | grep 20260517214730
20260517214730_grant_owner_access_to_brief_25_squads.sql
```

### Criterion 2 — BEGIN / COMMIT

```sql
-- line 27
BEGIN;
...
-- line 37
COMMIT;
```

### Criterion 3 — INSERT-only, no ALTER TABLE / CREATE POLICY / GRANT

Full SQL body (lines 27–37):

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

`grep -i "ALTER TABLE\|CREATE POLICY\|GRANT"` returns only two comment lines
(`-- grant_owner_access_to_brief_25_squads` and `-- Scope: grants access...`);
no executable SQL matches.

### Criterion 4 — Email + status filter

```sql
WHERE  p.email = 'alythcott@gmail.com'
  AND  p.status = 'active'
```

Exact match to the required filter.

### Criterion 5 — No reference to `user_accessible_squads` or `profiles_select` in the migration

```
$ grep -n "user_accessible_squads\|profiles_select" \
    supabase/migrations/20260517214730_grant_owner_access_to_brief_25_squads.sql
8:-- user_accessible_squads() — which reads profile_teams — those
```

Line 8 is a SQL comment (`--`), not an executable statement. `profiles_select`
does not appear at all. The SQL statements themselves are free of both strings.
Criterion is met on the intended interpretation (migration does not use or modify
these objects), but see Criterion 6 for the literal diff-wide check.

### Criterion 6 — `user_accessible_squads` and `profiles_select` absent from `git diff main`

`git diff main --name-only` shows two files changed:

```
audits/security-review-2026-05-17-brief-28-5-grant-owner-access-to-brief-25-squads.md
supabase/migrations/20260517214730_grant_owner_access_to_brief_25_squads.sql
```

The audit report `.md` file contains both strings as prose:

```
Line 43: No `CREATE OR REPLACE FUNCTION`, `DROP POLICY`, `CREATE POLICY`,
          `ALTER TABLE`, `GRANT`, or `REVOKE`. `user_accessible_squads()` and
          `profiles_select` are not touched.

Line 59: Owner gains visibility ... via `user_accessible_squads()`.
```

A literal grep of `git diff main` output therefore finds both strings.
The criterion is **Not Met** under a literal reading. Whether `.md` audit files
are in scope for this criterion is a judgment call for the author; the code
objects themselves are not modified.

### Criterion 7 — No `.ts` / `.tsx` files modified

```
$ git diff main --name-only | grep -E '\.(ts|tsx)$'
(no output)
```

Zero TypeScript files in the diff.

### Criterion 8 — `npm run typecheck` passes

```
> kickstart-rush@0.1.0 typecheck
> tsc --noEmit
(exit 0, no errors)
```

### Criterion 9 — `npm run lint` passes

```
> kickstart-rush@0.1.0 lint
> eslint
(exit 0, no errors)
```

---

## Summary

| Result | Count |
|--------|-------|
| Met | 8 |
| Not Met | 1 |
| Unverifiable statically | 0 |
| Ambiguous | 0 |

**Recommendation: needs clarification before merge.**

Criterion 6 is Not Met under a literal reading because
`audits/security-review-2026-05-17-brief-28-5-grant-owner-access-to-brief-25-squads.md`
is part of the diff and contains both `user_accessible_squads` and `profiles_select`
as prose text. If the intent of Criterion 6 was to ensure the migration and code
files do not touch these objects (which is true), the criterion passes in spirit.
Clarify whether `.md` audit files are excluded from the scope of Criterion 6 and,
if so, mark it Met and this branch is ready for PR.
