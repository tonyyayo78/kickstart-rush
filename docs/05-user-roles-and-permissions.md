# 05 — Users, Roles, and Permissions

## Audiences in MVP

The MVP has exactly two audiences:

| Audience | How they reach the app | What they need |
|----------|------------------------|----------------|
| **Owner** (you) | Sign in with magic link to `/sign-in` | Full edit and read across both squads |
| **Anonymous public visitor** | Direct URL to `/public/*` | Read-only fixtures, results (with scorers), standings |

There is no Coach role, no Viewer role, no Staff role, and no invitation flow in MVP. Those are introduced in Phase 2 (see `02-mvp-scope.md`).

## Permission matrix (MVP)

| Capability | Owner | Anonymous visitor |
|------------|:-----:|:-----------------:|
| Sign in | ✅ | ❌ |
| View dashboard | ✅ | ❌ |
| Create / edit / delete players | ✅ | ❌ |
| View player profiles, photos, DOB | ✅ | ❌ |
| Create / edit fixtures | ✅ | ❌ |
| **View fixtures (date, venue, opponent, status)** | ✅ | ✅ (via `public_fixtures`) |
| Enter / edit results | ✅ | ❌ |
| **View final scores** | ✅ | ✅ (via `public_results_with_scorers`) |
| **View scorers (display_name + minute)** | ✅ | ✅ (via `public_results_with_scorers`) |
| View half-time scores | ✅ | ❌ |
| View cards | ✅ | ❌ |
| Create / edit / read match reports | ✅ | ❌ |
| Create / edit / read player reviews | ✅ | ❌ |
| Set / view availability | ✅ | ❌ |
| Add / read player notes | ✅ | ❌ |
| **View league standings** | ✅ | ✅ (via `public_standings`) |
| Export CSV | ✅ | ❌ |
| View audit log | ✅ | ❌ |
| Configure squads / competitions | ✅ | ❌ |

## Public surface — what's in, what's out

### In (visible to anyone)

- **Fixtures:** date, kick-off time, venue, opponent name, home/away, match status, competition name and stage.
- **Results:** final score, scorer's display name, minute, penalty/own-goal flag.
- **Standings:** full league table including form column.
- **Squad names** ("Kickstart Elite", "Kickstart Premier") and other competition team names.

### Out (owner only)

- Roster lists, player records, photos, DOB, jersey numbers, position, status.
- Cards, half-time score, substitutions.
- Match reports, MOTM, key moments, coach notes.
- Availability for any fixture.
- Player reviews, ratings, trend charts.
- Notes.
- Any administrative or editing screen.
- Audit log.
- The owner's email or session.

## Public visibility of player names

Scorers are surfaced publicly because they were the explicit choice. Two safeguards reduce the exposure:

1. **`players.display_name`** is the only field used. The owner controls what this is — full name, "F. Lastname", first name only, or any other format — per player. Default to "F. Lastname" unless changed.
2. **Competition-level toggle.** `competitions.is_public` controls whether a competition is exposed at all. A friendly, internal trial match, or a competition the owner doesn't want public can be flipped off without code changes.

## Owner authentication

- Email magic-link sign-in via Supabase Auth.
- Only the owner's email is provisioned. Magic-link requests for any other email are rejected at the application layer (in the sign-in server action) and would fail at RLS even if a session were issued.
- Magic-link tokens expire in 15 minutes.
- Sessions expire after 30 days of inactivity.
- The owner can sign out of all sessions from the account screen.

## Enforcement

Permissions are enforced at three layers, in order of authority:

1. **Postgres privileges and RLS.** The `anon` role has `SELECT` on the three public views and **nothing else**. The `authenticated` role's access is gated by RLS policies that match the session against `profiles.role = 'owner'`.
2. **Server Actions.** Validate the session before issuing any mutating query; return 403 fast.
3. **UI.** Hide controls and pages a user cannot access. UI checks are convenience, not security.

A bug in route grouping cannot leak private data, because the anon Supabase client used in `(public)` routes has no read access to base tables.

## Security considerations for youth player data

Players in this app are minors. The data model and operational practices reflect that — and the public surface choices above are part of that posture.

### Data minimisation
- Store only what the club needs. DOB is required (eligibility); home address, school, and parent contact details are out of scope for MVP and should not be added without a documented reason.
- No medical history beyond a status flag (`injured`).

### Public surface restraint
- Public fixtures and standings reveal no individual player.
- Public results name scorers via `display_name` only. The owner can globally switch the public surface to use initials by changing how `display_name` is generated.
- Photos, DOB, and ratings are never on a public page.

### Access control
- Player photos are stored in a private Supabase Storage bucket. Photo URLs are signed and short-lived, generated server-side per request.
- Notes flagged private are extra-restricted; in MVP the owner is the only signed-in user, so this matters more in Phase 2.

### Authentication hygiene
- Magic-link emails expire in 15 minutes.
- Sessions expire after 30 days of inactivity.

### Audit trail
- Every change to player records, results, reviews, and notes is logged with user, timestamp, and before/after values.
- The audit log is read-only from the application.
- Audit retention: minimum two seasons.

### Backup and retention
- Daily encrypted backups (see `12-deployment-and-operations.md`).
- A player's data is **soft-deleted** on departure. Hard deletion follows a documented request from the player's parent or guardian and is performed via a maintenance script.

### Photographs
- Optional. The owner is responsible for confirming parental/guardian consent before adding a photo.
- Never displayed publicly.
- Not used for facial recognition or any automated processing.

### Disclosure
- The public site is `noindex`/`nofollow` and `robots.txt` disallows crawling. The decision to allow indexing is deferred and is a Phase 2 review item.
- The public surface contains no third-party trackers. Vercel Analytics and Sentry receive only error and performance data.

## Phase 2 additions (preview)

Once the qualifiers are done, this document expands to cover:

- **Coach** role with per-squad scoping (`assigned_squad_id`).
- **Viewer** role for trusted observers (read-only, broader than the public surface).
- **Staff** role (limited editing — availability, notes only).
- Invitation flow and user-management screen.
- Microsoft Entra ID SSO with group-to-role mapping.
- A defined data protection notice for parents.
- A formal review of indexing the public site.

Until then, "you and the public" is the entire mental model.
