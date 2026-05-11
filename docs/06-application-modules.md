# 06 — Application Modules

Each module below has a defined purpose, a small set of key screens, the main actions a user can take, the data it touches, and post-MVP enhancements.

In MVP, all private modules are owner-only. The new **Public Site** module surfaces a narrow read-only view to anonymous visitors.

## Module 0 — Public Site (new)

### Purpose
A small read-only surface for anyone with the URL — parents, players, opposing clubs, the wider football community. No login. No private data. No links into the authenticated app.

### Key screens
- **Public fixtures** (`/public/fixtures`) — Upcoming and recent fixtures across both squads, filterable by squad/month.
- **Public results** (`/public/results`) — Played fixtures with final score and scorers (display_name + minute).
- **Public standings** (`/public/standings`) — Full league table per zone with form column.

### Main actions
- View only. No interactive forms.
- Filter by squad, by competition, by month.
- Toggle between Zone A and Zone B on the standings page.

### Data involved
- `public_fixtures` view
- `public_results_with_scorers` view
- `public_standings` view

No base tables are queried from public pages.

### Out of scope for the public site (MVP)
- Player profiles, photos, rosters.
- Cards, half-time scores, substitutions.
- Match reports, MOTM, coach notes.
- Reviews, notes, availability.
- Leading scorers chart, top assists, milestones — these aggregate player names in ways that warrant Phase 2 review before exposing.

### Layout and behaviour
- Minimal layout; no navigation linking to `/sign-in` or the authenticated app.
- Mobile-first. Standings table horizontally scrolls on narrow screens.
- `<meta name="robots" content="noindex,nofollow">` on every public page.
- `robots.txt` disallows crawling of `/public/*`.
- No third-party analytics or trackers on public pages.

### Future enhancements
- Curated public match-report excerpts (Phase 3, with explicit per-report toggle).
- Leading-scorers card (Phase 2 review on whether this is appropriate).
- Public knockout bracket for Super 8 / Plate.
- Optional: public archive of past seasons.
- Decision to allow search-engine indexing.

## Module 1 — Dashboard (private)

### Purpose
A landing page after sign-in that answers "what do I need to know right now?" in under five seconds.

### Key screens
- **Home / Dashboard** (`/`) — Tile grid for the owner.

### Tiles (MVP)
- Next fixture per squad (date, opponent, venue, kick-off, home/away).
- Last result per squad (score, opponent, link to match report).
- Current league position per zone.
- Players to review this month (count + list of overdue reviews).
- Open availabilities for the next fixture (count of "unknown").

### Main actions
- Click any tile to drill in.
- "Quick add" floating button → New result, New note, New review.

### Data involved
- `fixtures`, `results`, `competition_standings`, `player_reviews`, `availabilities`, `players`.

### Future enhancements
- Tile customisation (Phase 2).
- Trend tiles ("form is improving").
- Notifications inbox.

## Module 2 — Fixtures and Results (private editing)

### Purpose
Manage every match for both squads — qualifiers, knockouts, friendlies — and the results once played.

### Key screens
- **Fixture list** (`/fixtures`) — Filter by squad, month, competition, status.
- **Fixture detail** (`/fixtures/[id]`) — All info on one match.
- **New / edit fixture** (`/fixtures/new`, `/fixtures/[id]/edit`).
- **Result entry** (`/fixtures/[id]/result`) — Mobile-first form: scores → scorers → cards → save.

### Main actions
- View upcoming and past fixtures.
- Add a fixture.
- Edit kick-off, venue, status.
- Enter result.
- Edit result with reason captured in audit log.
- Cancel / postpone.

### Data involved
- `fixtures`, `results`, `goals`, `cards`, `player_match_stats`, `competition_teams`, `players`, `audit_log`.

### Public surface implications
- Saving a result writes to `goals` with `scorer_label` populated by trigger (display_name for our players, opponent team name otherwise).
- Public results page reflects the new score and scorers on next render.

### Future enhancements
- Substitution-by-substitution timeline.
- Lineup picker (drag and drop).
- Pre-match opposition scouting notes.
- Push to Outlook / Google Calendar.

## Module 3 — League Table / Standings (private full view; public mirror)

### Purpose
A live, automatically calculated league table for each zone — the single visualisation everyone agrees with because no one types it.

### Key screens
- **Standings (private)** (`/standings`) — Two tables side by side or selectable: Zone A, Zone B.
- **Standings (public)** (`/public/standings`) — Same data, simpler chrome.

### Columns
`Pos | Team | P | W | D | L | GF | GA | GD | Pts | Form (last 5)`

### Main actions
- Switch zone.
- Export CSV (private only).
- Tie-breaker explanation on hover (which rule put which team above which).

### Data involved
- `competition_standings`, `public_standings`.

### Future enhancements
- Super 8 / Plate bracket view.
- Visual cut line (top 4, bottom 4).
- "If we beat X, we finish Y" simulator.

## Module 4 — Player Profiles (private)

### Purpose
Every player's record — identity, status, statistics, progression — in one place.

### Key screens
- **Squad list** (`/squads/[code]/players`).
- **Player profile** (`/players/[id]`) — Tabs: Overview, Reviews, Matches, Availability, Notes.
- **Edit player** (`/players/[id]/edit`).

### Tabs
- **Overview** — Photo, name, DOB, age, position, jersey, status, headline stats, latest review summary.
- **Reviews** — Trend chart (4 dimensions over time) + reviews list.
- **Matches** — Per-match row: date, opponent, started/sub, minutes, goals, cards.
- **Availability** — Upcoming fixtures with status.
- **Notes** — Reverse-chronological feed.

### Main actions
- Add / edit player.
- Mark availability.
- Add a note.
- Start a review.
- Soft-delete.

### Data involved
- `players`, `player_match_stats`, `player_reviews`, `notes`, `availabilities`.

### Future enhancements
- Career view across seasons / squads.
- Position-specific benchmarks.
- Exportable PDF for parent meetings.
- Photo gallery.

## Module 5 — Player Progress Reviews (private)

### Purpose
Force a structured, regular conversation about every player.

### Key screens
- **Reviews due** (`/reviews/due`).
- **New review** (`/reviews/new?player=...`).
- **Edit / correct review** (`/reviews/[id]/correct`).
- **Player profile → Reviews tab**.

### Main actions
- Start a review.
- Submit (immutable on save).
- Correct (creates a new entry; old retained).
- Filter due list by squad.

### Data involved
- `player_reviews`, `players`, `profiles`.

### Future enhancements
- Templates per position.
- Cohort comparison.
- Email reminders.

## Module 6 — Match Reports (private)

### Purpose
Capture what actually happened beyond the score line.

### Key screens
- **Reports list** (`/reports`).
- **Report editor** (`/fixtures/[id]/report`).
- **Report read view** linked from fixture detail.

### Main actions
- Draft a report immediately after a result.
- Save and edit later.
- Tag MOTM.

### Data involved
- `match_reports`, `fixtures`, `results`, `players`.

### Public surface implications
- **Match reports remain private in MVP** even when `status = 'published'`. The `published` flag is reserved for a Phase 3 curated public surface.

### Future enhancements
- Rich text.
- Photo attachments.
- AI-generated draft.
- PDF export.

## Module 7 — Availability / Attendance (private)

### Purpose
Know who's going to be there. The matchday squad view is the lowest-friction tool a coach uses on the touchline.

### Key screens
- **Matchday squad** (`/fixtures/[id]/availability`).
- **Availability bulk-edit**.

### Main actions
- For an upcoming fixture, mark each player Available / Unavailable / Injured / Suspended / Unknown.
- Add an optional reason.
- See a summary count.

### Data involved
- `availabilities`, `players`, `fixtures`.

### Future enhancements
- Training session attendance.
- Player self-marks via token link.
- Attendance analytics.
- Push reminders 48h before kick-off.

## Module 8 — Notes / Observations (private)

### Purpose
Capture small things that turn into big things. A textarea on every player profile, designed for 30-second use.

### Key screens
- **Player profile → Notes tab**.
- **All notes view (Phase 2)**.

### Main actions
- Add a note.
- Edit own note.
- Delete own note (soft-delete).

### Data involved
- `notes`, `players`, `profiles`.

### Future enhancements
- Tagging.
- Linking to fixtures or training.
- Search.
- Recurring-theme highlighting (Phase 3, possibly AI-assisted).
