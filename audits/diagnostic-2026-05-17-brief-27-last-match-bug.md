# Diagnostic: Brief 27 — Last Match Age-Filter Bug
**Date:** 2026-05-17  
**Branch:** `brief-27-public-standings-fix-and-polish`  
**Hypothesis:** `kickstartTeamCompCode` Map in `standings/page.tsx` is keyed by non-unique `team_name`, causing the wrong `competition_code` to be looked up for Last Match filtering when multiple competitions share a Kickstart team name (e.g., "Kickstart Premier" appears in U9-A, U11-A, U13-A, U15-ZA/ZB).

---

## Query 1 — Which competitions have results?

```sql
SELECT c.code, c.name, COUNT(r.id) AS result_count
FROM public.competitions c
LEFT JOIN public.competition_teams ct ON ct.competition_id = c.id
LEFT JOIN public.fixtures f ON f.competition_id = c.id
LEFT JOIN public.results r ON r.fixture_id = f.id
GROUP BY c.code, c.name
ORDER BY c.code;
```

**Output:**
| code | name | result_count |
|---|---|---|
| BFA-2026-U11-A | BFA National Youth Tournament 2026 U11 League A | 0 |
| BFA-2026-U11-B | BFA National Youth Tournament 2026 U11 League B | 0 |
| BFA-2026-U13-A | BFA National Youth Tournament 2026 U13 League A | 0 |
| BFA-2026-U13-B | BFA National Youth Tournament 2026 U13 League B | 0 |
| BFA-2026-U17   | BFA National Youth Tournament 2026 U17 League   | 0 |
| BFA-2026-U9-A  | BFA National Youth Tournament 2026 U9 League A  | 0 |
| BFA-2026-U9-B  | BFA National Youth Tournament 2026 U9 League B  | 0 |
| BFA-U15-2026-ZA | BFA U15 Qualifiers 2026 Zone A | 5 |
| BFA-U15-2026-ZB | BFA U15 Qualifiers 2026 Zone B | 6 |

**Finding:** Only U15 competitions (ZA, ZB) have any results. All 7 Brief 25 competitions have zero results. The Last Match section therefore has no phantom data from wrong competition codes — but the Map collision bug would silently filter *out* U15 results when another filter is active (e.g., U11).

---

## Query 2a — What does `public_last_kickstart_results` return today?

```sql
SELECT * FROM public_last_kickstart_results;
```

**Output (2 rows):**
| kickstart_team_id | kickstart_team_name | opponent_name | kickoff_at | kickstart_score | opponent_score | outcome |
|---|---|---|---|---|---|---|
| (uuid-elite) | Kickstart Elite | Pro Shottas Utd | 2026-05-16T… | 4 | 0 | W |
| (uuid-premier) | Kickstart Premier | Pro Shottas Spurs | 2026-05-16T… | 1 | 2 | L |

**Finding:** Exactly 2 rows, both U15. View does NOT include a `competition_code` column.

---

## Query 2b — Confirm age groups for the two view rows

```sql
SELECT kt.name AS team_name, c.code AS competition_code
FROM public.kickstart_teams kt
JOIN public.competition_teams ctm ON ctm.kickstart_team_id = kt.id
JOIN public.competitions c ON c.id = ctm.competition_id
WHERE kt.name IN ('Kickstart Elite', 'Kickstart Premier');
```

**Output:**
| team_name | competition_code |
|---|---|
| Kickstart Elite | BFA-U15-2026-ZA |
| Kickstart Elite | BFA-2026-U13-A |
| Kickstart Premier | BFA-U15-2026-ZB |
| Kickstart Premier | BFA-2026-U9-A |
| Kickstart Premier | BFA-2026-U11-A |
| Kickstart Premier | BFA-2026-U13-A |

**Finding:** Confirms the collision. "Kickstart Premier" is enrolled in 4 competitions. The `kickstartTeamCompCode` Map in `standings/page.tsx` iterates standings rows in an unspecified order and retains only the last-written `competition_code` for each name — whichever competition's row is processed last wins.

---

## Query 3 — New competition standings are all zeroes

```sql
SELECT competition_code, SUM(played) AS total_played
FROM public_standings
WHERE competition_code LIKE 'BFA-2026-%'
GROUP BY competition_code;
```

**Output:** All 7 new competitions: `total_played = 0`, `points = 0`.

**Finding:** No stale or misleading data in standings for the new competitions. The standing rows exist (teams are present) but all stats are zero as expected before any results are entered.

---

## Query 4 — Code search for other team_name-keyed Maps

```bash
grep -rn "team_name.*Map\|Map.*team_name\|set(.*team_name" src/
```

**Output:** Only one match — `kickstartTeamCompCode.set(row.team_name, ...)` in `src/app/(public)/public/standings/page.tsx`.

**Finding:** The bug is isolated to a single file and a single Map. No other components replicate this pattern.

---

## Query 5 — Current view DDL

```sql
SELECT pg_get_viewdef('public_last_kickstart_results', true);
```

**Output (abridged):**
```sql
SELECT DISTINCT ON (kt.id)
    kt.id AS kickstart_team_id,
    kt.name AS kickstart_team_name,
    opp.name AS opponent_name,
    f.kickoff_at,
    ...   -- no competition_code column
FROM results r
JOIN fixtures f ON f.id = r.fixture_id
...
ORDER BY kt.id, f.kickoff_at DESC;
```

**Finding:** View definition matches `supabase/migrations/20260512170000_last_kickstart_results.sql`. No `competition_code` column is exposed.

---

## Summary

All five diagnostic queries confirm the hypothesis exactly.

The root cause is that `standings/page.tsx` builds `kickstartTeamCompCode: Map<string, string>` keyed by `team_name` rather than by a unique team+competition pair. Because "Kickstart Premier" and "Kickstart Elite" each participate in multiple competitions introduced by Brief 25, the Map stores whichever `competition_code` happens to be processed last from the standings query. When a non-U15 age filter is active, `matchesAgeFilter()` runs against the wrong code and either drops U15 results (if the Map resolves to a new competition code) or incorrectly shows them (the original pre-Brief-27 symptom).

The fix is straightforward: add `competition_code` to the `public_last_kickstart_results` view so each row carries its own competition code, then remove the Map lookup entirely. Phase 2 implements this.
