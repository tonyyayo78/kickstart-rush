# Security Review R1 — 2026-05-17 — `brief-22-public-realtime`

**Reviewer:** security-reviewer agent
**Date:** 2026-05-17
**Branch:** `brief-22-public-realtime`
**Base:** `main`
**Model:** claude-sonnet-4-6

---

## Summary

R1 identified two Critical and two High findings. All were addressed before the PR was opened. See R2 report for resolution details.

## Findings

| # | Severity | Title |
|---|---|---|
| 1 | **Critical** | `results_anon_select` relied on implicit RLS chaining instead of explicit `is_kickstart_competition()` call |
| 2 | **Critical** | `goals_anon_select` relied on two-hop implicit RLS chaining instead of explicit call |
| 3 | **High** | `cards_anon_select` relied on single-hop implicit RLS chaining instead of explicit call |
| 4 | **High** | Realtime subscription has no filter parameter — fires on all table changes |

## Action taken

- Findings 1–3: Migration corrected to add explicit `AND is_kickstart_competition(f.competition_id)` to all three child-table USING clauses. Fixup migration `20260517113131_fix_public_realtime_policies.sql` applied to remote DB.
- Finding 4: Accepted as documented tradeoff — callbacks discard payload; `router.refresh()` re-fetches from scoped server-side views only.

See `audits/security-review-2026-05-17-brief-22-public-realtime-r2.md` for full R2 analysis.
