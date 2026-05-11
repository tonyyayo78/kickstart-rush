# 02 — MVP Scope and Roadmap

The MVP exists to get both squads through the U15 qualifiers (May–June 2026) with a working operational system. Anything that is not required to do that is deferred.

## Access model in MVP

The MVP has exactly two audiences:

- **Owner (you).** Signed in. Full edit rights across both squads.
- **Anonymous public reader.** No login. Sees a narrow read-only surface only.

There are no other roles, no invitations, no user-management screens. Multi-user access is a Phase 2 concern.

### Public surface (read-only, no login)

Everyone with the URL can see:

| Surface | Data |
|---------|------|
| Fixtures | Date, kick-off, venue, opponent, home/away, status (scheduled / played / postponed / cancelled), competition stage |
| Results | Final score, scorers (player names + minute), match status |
| Standings | Full league table per zone: P, W, D, L, GF, GA, GD, Pts, Form (last 5) |
| Squad identity | "Kickstart Elite", "Kickstart Premier" — names only |

### Private surface (owner only, requires sign-in)

Everything else, including:

- Full player records (DOB, photo, jersey, position, status)
- Cards (yellow/red and which player)
- Match reports (summary, key moments, MOTM, coach notes)
- Player reviews and trend charts
- Availability
- Notes
- Audit log
- Any administrative or editing screens

### Search-engine indexing

Public pages are served with `noindex, nofollow` and a `robots.txt` that disallows crawling. The decision to allow indexing is deferred. Pages remain reachable by direct URL.

## MVP scope (in)

The MVP delivers eight modules at functional, not polished, depth, plus a small public site.

### 1. Authentication (single owner)
- Email magic-link sign-in for the owner only.
- The owner's email is the single allow-listed account; magic-link requests for any other address are rejected at the application layer and would fail at RLS even if a session were issued.
- No invitation flow, no user-management screen, no role switching.

### 2. Squads and players
- Two squads pre-seeded: Kickstart Elite and Kickstart Premier.
- Player records: name, DOB, preferred position, jersey number, status (active / injured / unavailable / inactive), squad assignment.
- Photo upload per player (optional).
- Soft-delete only — no hard deletes of player records.

### 3. Fixtures
- Pre-seeded with the BFA U15 Zone A and Zone B qualifier fixtures (28 per zone group stage).
- Per fixture: date, kick-off, venue, opponent, home/away, competition stage (Qualifier / Super 8 / Plate / Knockout / Friendly), status.
- Edit kick-off, venue, status. Add new fixtures.
- Filter by squad, by month, by status.

### 4. Results entry
- Final score, half-time score (optional), scorers (multiple, with minute), assists (optional), cards (yellow/red, with player and minute), substitutions (optional in MVP), match status set to Played.
- Audit trail: every save records the actor and timestamp.
- Edit history visible to the owner.

### 5. League standings
- Computed from results — never manually edited.
- Standard table: Played, Won, Drawn, Lost, GF, GA, GD, Pts.
- Tie-breakers: Points → Goal Difference → Goals For → Head-to-Head.
- Form column showing last five (W/D/L pills).
- Separate tables for Zone A and Zone B during qualifiers.

### 6. Match reports
- One short report per played fixture: summary, key moments, MOTM, coach notes.
- **Match reports are private in MVP** — owner only. They are not part of the public surface.
- Save as draft or publish (publish flag is forward-looking; in MVP both states remain owner-only).

### 7. Player progress reviews
- Structured monthly review per player covering four dimensions on a 1–5 scale: **Technical**, **Tactical**, **Physical**, **Attitude**.
- Free-text strengths, areas to work on, next-month focus.
- Reviews are immutable once saved (correction = new review with reason).
- Player profile shows trend lines across reviews.
- **Reviews are private** — owner only.

### 8. Availability and attendance
- Per fixture: mark each squad player as Available, Unavailable, Injured, Suspended, with optional reason.
- One-screen "matchday squad" view that the owner uses on the touchline.
- **Private** — owner only.

### 9. Public site (new)
- Three public pages, no login: `/public/fixtures`, `/public/results`, `/public/standings`.
- Backed by dedicated Postgres views that expose only the columns listed in the public surface table above.
- `robots.txt` disallow + `noindex` meta tag on every page.
- No links from the public site into the authenticated app.

### Cross-cutting MVP features
- Mobile-responsive (phone-first for data entry forms; phone-first for the public site too).
- Audit log on results, reviews, and player record edits.
- CSV export of fixtures, results, players, and the current standings table (owner only).
- Daily automated database backup (Supabase).

## MVP scope (out)

These are deliberately deferred:

- Multi-user access (coach, viewer, staff accounts).
- Invitation flow and user-management screen.
- Role-based permissions beyond owner-vs-public.
- Parent or player logins.
- Public match reports, public player profiles, public photos.
- Public scorers' chart, leading scorers ranking — these expose player names in aggregate and are deferred until the public surface model is reviewed.
- Push notifications, email summaries, scheduled reports.
- Microsoft Entra ID / SSO.
- Office 365 calendar sync.
- Training plans, drills library, session attendance analytics.
- Injury tracking with medical history.
- Substitution-by-substitution timeline editor.
- Heatmaps, GPS, video, advanced analytics.
- Multi-tenant / multi-club support.
- AI-generated match summaries.
- Bulk player import via CSV.
- Translation / localisation.
- Search-engine indexing of public pages.

## Phased roadmap

### Phase 1 — MVP (Weeks 1–4 of build)
Goal: a working, mobile-friendly app the owner can use through the qualifiers, with a small public read-only surface.

- All eight private modules at functional depth.
- Public site (fixtures, results, standings).
- Single-owner email login.
- Both squads' fixtures pre-loaded.
- CSV exports.
- Deployed to Vercel production with preview environments.

### Phase 2 — Stabilisation and depth (Weeks 5–10)
Goal: the app earns its place after qualifiers and becomes the daily operating system for the club, with a small trusted team.

- Add Coach and Viewer roles, invitation flow, user-management screen.
- Per-squad coach scoping (a coach assigned to Elite cannot edit Premier).
- Microsoft Entra ID / Office 365 SSO for staff.
- Dashboard tiles (next fixture, current position, last result, players to watch).
- Player career view (across multiple seasons / squads).
- Training session module: schedule, attendance, simple drill notes.
- Notifications: email digest of upcoming fixtures and missed reviews.
- Improved match report editor (rich text, images).
- Knockout-stage bracket view for Super 8 and Plate.
- Decision point on indexing the public site.

### Phase 3 — Extending the platform (Weeks 11+)
Goal: external visibility, deeper analytics, integrations.

- Richer public surface (optional): public match reports (curated), leading scorers, club news.
- Parent portal (per-player invite-only access).
- Microsoft 365 calendar integration (fixtures and training appear in staff calendars).
- Injury tracking with status, expected return, history.
- AI-generated draft match summaries from result + scorers.
- Player development analytics: cohort comparisons, position-specific benchmarks.
- Mobile PWA install with limited offline read.
- Export to PDF for parent meetings and end-of-season reports.

## MoSCoW prioritisation (MVP)

| Feature | Priority |
|---------|----------|
| Single-owner email magic-link login | Must |
| Squads and player records (CRUD) | Must |
| Fixtures pre-seeded for both zones | Must |
| Result entry with scorers and cards | Must |
| Auto-calculated league standings | Must |
| Match reports (private, basic) | Must |
| Player progress reviews (monthly, 1–5 scales) | Must |
| Availability per fixture | Must |
| Mobile-responsive UI | Must |
| Audit trail on results and reviews | Must |
| Daily backup | Must |
| Public fixtures page | Must |
| Public results page (with scorers) | Must |
| Public standings page | Must |
| `noindex` + `robots.txt` disallow on public pages | Must |
| Public Postgres views with explicit column allow-list | Must |
| CSV exports (owner only) | Should |
| Player photos | Should |
| Player profile trend chart | Should |
| Form column on standings | Should |
| Edit history visible to owner | Should |
| Soft-delete players | Should |
| Knockout / Super 8 / Plate fixture stage flag | Should |
| Substitution recording in result entry | Could |
| Half-time score | Could |
| MOTM badge on player profile | Could |
| Drag-and-drop matchday squad picker | Could |
| Coach/Viewer accounts and invitations | Won't (this release) |
| Entra ID SSO | Won't (this release) |
| Push notifications | Won't (this release) |
| Public match reports | Won't (this release) |

## Definition of MVP done

The MVP is releasable when:

1. All **Must** items pass UAT against `11-testing-strategy.md`.
2. Both squads' qualifier fixtures are loaded and visible (privately and publicly).
3. The owner has signed in and entered at least one result on a phone; the standings table has updated correctly; the public results page shows the same score with scorers.
4. The public pages are reachable by direct URL, render correctly, and contain none of the private fields listed in `05-user-roles-and-permissions.md`.
5. `robots.txt` and `noindex` headers verified on the public pages.
6. A monthly review has been completed for at least one player and the trend renders on their profile.
7. A daily backup has run successfully for three consecutive days.
8. The production URL is live on Vercel with a custom domain (or `*.vercel.app` if domain not yet configured).
