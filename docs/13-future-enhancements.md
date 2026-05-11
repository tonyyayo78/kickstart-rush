# 13 — Future Enhancements

Captured here so they don't leak into MVP, and so the next phase has a real backlog to draw from.

## Parent portal

A narrow, invite-only experience for parents to see their child's data.

- Per-player invitation token, no full account creation.
- Read access to: their child's reviews, match minutes, attendance, public notes, matchday availability.
- No access to: other players, coach private notes, audit log.
- Strict RLS scoping by `player_id` claim on the parent's session.
- Optional: parent can mark availability ahead of fixtures.
- Driver: pressure on coaches to share progress; reduces 1:1 messaging.

## Public fixtures and results page

A read-only page for the wider community.

- Anonymised: team-level only; no player names, photos, or notes.
- Server-rendered, cache-friendly.
- Ideal as a Phase 3 deliverable just before the next qualifying season.
- Deployed at a separate path (e.g. `/public/fixtures`) or sub-domain.

## Training attendance and analytics

Training is the lever players actually develop on. The MVP captures match data; this captures the rest.

- Training session entity (date, type, focus areas, present players).
- Bulk attendance entry (one screen, two taps per player).
- Analytics: attendance % per player, per month, per squad.
- Correlation views (Phase 3): does training attendance correlate with playing time?
- Driver: parents and players asking "why didn't I get on?" with answers grounded in attendance.

## Injury tracking

Beyond the simple `injured` status flag in MVP.

- Injury record: type, body part, date occurred, expected return.
- Status timeline (training-only / non-contact / fully fit).
- History per player.
- Manager-only access.
- Returning-from-injury alerts on the dashboard.

## Notifications

- Email digest every Friday with the weekend's fixtures, current availability gaps, and reviews due.
- In-app inbox surfacing what changed since last sign-in (new reviews on shared players, fixtures changed, drafts ready to publish).
- Phase 3: opt-in SMS or WhatsApp via a third-party provider for matchday changes (postponements).

## AI-generated match summaries

After a result is entered with scorers and a brief coach note, an AI-generated draft summary is offered.

- Coach reviews and edits before publishing.
- Strictly assistive: never auto-published.
- Inputs: result, scorers, cards, coach key-moments bullet list.
- Output: 150–250 word match report draft, neutral tone.
- Implementation: server-side call to a model API; prompt and cost are auditable.

## Microsoft 365 integration

The Office 365 / Azure tenancy is leveraged in three concrete ways post-MVP.

### Entra ID SSO (Phase 2)
- See `03-solution-architecture.md` and `05-user-roles-and-permissions.md`.
- Replaces magic-link sign-in for staff.
- Role mapping from Entra groups.

### Outlook calendar push (Phase 3)
- One-way sync: fixtures and training sessions appear in staff Outlook calendars.
- Per-staff toggle.
- Deletes / changes propagate.

### SharePoint / OneDrive backup target (Phase 3)
- Weekly encrypted database export written to a designated SharePoint folder owned by the club.
- Retention managed by Microsoft 365's existing policies.

### Teams notifications (Phase 3, optional)
- Adaptive card posted to a club Teams channel each Friday with the weekend's fixtures.
- Manager-controlled toggle.

## Knockout-stage support extended

MVP models the qualifier group stage and supports Super 8 / Plate as additional competitions. Phase 2 enriches this:

- Bracket visualisation for Super 8 and Plate.
- Auto-progression rules (top 4 / bottom 4 from each zone) with a manager override.
- "If we finish 1st, 2nd, 3rd, 4th — possible Super 8 paths" simulator.

## Player development analytics

- Cohort views: "all U15 players who played > 200 minutes this season".
- Position-specific dashboards (e.g. central midfielders' technical scores trend).
- Comparison: a player against squad averages over time.
- End-of-season report card per player, exportable to PDF.

## PWA and offline

- Make the app installable as a PWA (icon, splash, offline shell).
- Phase 3: limited offline read of the next fixture, the matchday squad screen, and recent player notes.
- Offline writes (queued and synced) are intentionally deferred — they are complex and not worth it until a real venue connectivity problem persists.

## Multi-season

- Once season 2026 ends, season 2027 starts.
- Players persist across seasons, with squad assignments per season.
- Standings, fixtures, and reviews are scoped to season.
- Ageing-up logic: a player who turns 16 leaves the U15 squad with their full history retained.

## Other ideas captured for the backlog

- Custom dashboard tiles per user.
- Tagging system for notes (technical, behavioural, parent communication).
- Search across all notes and reports.
- Roster import from CSV (when needed for a future season with more squads).
- Equipment / kit register.
- Ref / opposition profiling.
- Heatmap and average-position visualisation (would require positional data — not modelled yet).
- Wearable / GPS data integration (only if the club adopts a system; not on the path).
- Translation (English-only is fine for MVP and the foreseeable future).

These are listed without commitment. They make the cut when the manager decides they will be used, not when they look interesting.
