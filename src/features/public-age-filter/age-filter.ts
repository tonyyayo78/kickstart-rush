export const AGE_GROUPS = ["U9", "U11", "U13", "U15", "U17"] as const;
export type AgeGroup = typeof AGE_GROUPS[number];
export type AgeFilter = AgeGroup | "all";

// Change this constant to flip the default once more age groups start playing.
export const DEFAULT_AGE: AgeFilter = "U15";

/**
 * Parse the ?age=... query param into a validated AgeFilter, falling back to DEFAULT_AGE.
 * "all" is no longer a user-selectable filter; legacy bookmarks fall back to the default.
 */
export function parseAgeParam(raw: string | string[] | undefined): AgeFilter {
  if (typeof raw !== "string") return DEFAULT_AGE;
  if (raw === "all") return DEFAULT_AGE;
  if ((AGE_GROUPS as readonly string[]).includes(raw)) return raw as AgeGroup;
  return DEFAULT_AGE;
}

/**
 * Extract age group from a competition code in either format:
 *  - "BFA-2026-U13-A" → "U13"
 *  - "BFA-U15-2026-ZA" → "U15"
 *  - "BFA-2026-U17"   → "U17"
 * Returns null if the code doesn't match either pattern.
 */
export function ageGroupFromCompetitionCode(code: string | null | undefined): AgeGroup | null {
  if (!code) return null;
  const m1 = code.match(/^BFA-2026-U(\d+)(?:-[A-Z])?$/i);
  if (m1) {
    const candidate = `U${m1[1]}`;
    return (AGE_GROUPS as readonly string[]).includes(candidate) ? (candidate as AgeGroup) : null;
  }
  const m2 = code.match(/^BFA-U(\d+)-\d+-Z[A-Z]$/i);
  if (m2) {
    const candidate = `U${m2[1]}`;
    return (AGE_GROUPS as readonly string[]).includes(candidate) ? (candidate as AgeGroup) : null;
  }
  return null;
}

/**
 * For a chosen AgeFilter, build the LIKE-pattern list to feed into Supabase .or() / .ilike()
 * queries. Returns array of patterns covering BOTH code formats.
 */
export function competitionCodePatternsFor(filter: AgeFilter): string[] {
  if (filter === "all") return [];
  // Format 1: BFA-2026-U13-A / BFA-2026-U17
  // Format 2: BFA-U15-2026-Z*
  return [
    `BFA-2026-${filter}-%`,
    `BFA-2026-${filter}`,            // exact match for U17-style single-zone codes
    `BFA-${filter}-%-Z%`,
  ];
}

/**
 * Long-form competition label for /public/* pages.
 *
 * "BFA-2026-U13-A"  → "Under 13 League A"
 * "BFA-2026-U17"    → "Under 17 League"
 * "BFA-U15-2026-ZA" → "Under 15 League A"
 *
 * Falls back to the raw code for unrecognized formats so debugging is possible.
 */
export function competitionLabel(code: string | null | undefined): string {
  if (!code) return "";
  const m1 = code.match(/^BFA-2026-U(\d+)(?:-([A-Z]))?$/i);
  if (m1) {
    const zone = m1[2];
    return zone ? `Under ${m1[1]} League ${zone.toUpperCase()}` : `Under ${m1[1]} League`;
  }
  const m2 = code.match(/^BFA-U(\d+)-\d+-Z([A-Z])$/i);
  if (m2) {
    return `Under ${m2[1]} League ${m2[2].toUpperCase()}`;
  }
  return code;
}

/**
 * Predicate for client-side filtering when a Server Component already has rows in hand
 * and just needs to filter by age group.
 */
export function matchesAgeFilter(competitionCode: string | null | undefined, filter: AgeFilter): boolean {
  if (filter === "all") return true;
  return ageGroupFromCompetitionCode(competitionCode) === filter;
}
