# 10 — Non-Functional Requirements

These are the qualities the app must have alongside its features. They are testable, scoped to the realities of a single-club app, and prioritised for what matters during qualifiers.

## Security

### Authentication
- All non-public routes require a valid session.
- Magic-link tokens expire in 15 minutes.
- Sessions expire after 30 days of inactivity.
- The Manager can revoke any user's sessions immediately.

### Authorisation
- Row-level security is enabled on every user-data table from day one.
- The default RLS posture is **deny**; explicit policies grant access by role and ownership.
- Privileged operations (user management, role changes, hard deletes) require Manager role.
- The Supabase service-role key is never exposed to the client and is only used in server-only contexts.

### Secrets
- No secrets in the repo. `.env.example` documents required variables; `.env.local` is gitignored.
- Production secrets live only in Vercel and Supabase project settings.
- Secrets are rotated when a coach with admin-adjacent access leaves.

### Transport
- HTTPS only. Vercel handles certificates.
- HSTS enabled.
- Strict referrer policy.

### Application
- Server actions validate every input with Zod schemas.
- File uploads (photos) are size-limited (max 5 MB), MIME-checked, and stored in a private bucket with signed URLs.
- Audit log records every change to results, reviews, and player records, including the actor.

### Threats explicitly addressed
- **Privilege escalation:** RLS prevents a Coach from impersonating a Manager.
- **CSRF:** Server actions use Next.js's built-in protections.
- **Stored XSS:** All user-entered text is rendered as text by default; rich text is not enabled in MVP.
- **Enumeration:** Error messages on sign-in do not reveal whether an email is registered.

### Threats explicitly out of scope (MVP)
- DDoS protection beyond what Vercel provides by default.
- Penetration testing by a third party.
- Bug-bounty programme.

## Performance

For a single-club app with a few dozen weekly users, "fast" is realistic and tested as the user would experience it.

| Metric | Target | Tested via |
|--------|--------|------------|
| Time to interactive on dashboard (4G) | < 2.5s | Lighthouse on preview URL |
| Result entry form save | < 1.5s server time | Server action timing |
| Standings page load | < 1.0s | Postgres view query plan + Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Total page weight (initial) | < 250 KB JS | Next.js bundle analyser |
| Database query p95 | < 200 ms | Supabase query insights |

Performance is not over-optimised. Caching is added if and when a real screen feels slow, not pre-emptively.

## Accessibility

The app must be usable by a coach with a vision impairment, a parent with low technical literacy, and a person with limited dexterity. WCAG 2.1 AA is the target.

| Requirement | How it's met |
|-------------|--------------|
| Colour contrast ≥ 4.5:1 (text) and 3:1 (large text / UI) | Tailwind tokens chosen for contrast; tested with axe |
| Every form field has a label | Enforced via shadcn/ui patterns; lint rule `jsx-a11y/label-has-associated-control` |
| Visible focus state on every interactive element | Tailwind focus rings, not removed |
| Keyboard navigable, including all dialogs and menus | Tested per feature in Playwright |
| Screen reader landmarks | `<main>`, `<nav>`, `<aside>` used correctly |
| Sufficient touch target size (≥ 44×44 px) | Default button sizes meet this; spot-checked |
| No reliance on colour alone | Form (W/D/L) pills include letter; status uses both colour and text |
| Animations respect `prefers-reduced-motion` | Transitions opt-out automatically |

## Mobile responsiveness

Coaches will use phones at venues. Mobile is not a "responsive afterthought" — it is the primary form factor for data entry.

- Every page renders correctly at 360 px wide.
- Forms used on the touchline (result entry, availability, notes) are designed mobile-first.
- Tap targets ≥ 44 px; no hover-only interactions.
- The matchday squad screen is one column and avoids modals where possible.
- Tables (e.g. standings) are horizontally scrollable, not crushed, on narrow screens.
- Numeric inputs use `inputmode` so phones show the right keyboard.
- Photos are uploaded via the device camera or gallery using the standard file input.

Tested on:
- iOS Safari (latest).
- Android Chrome (latest).
- A device with a small screen (e.g. iPhone SE class).

## Backup and export

### Backups
- **Daily automated** Supabase backup (point-in-time recovery on supported plans, daily snapshot otherwise).
- **Weekly manual export** of a structural dump (`pg_dump`) saved to a separate location (Manager's OneDrive in the Office 365 tenant).
- **Before any production migration** — a snapshot is taken or the migration is rejected.

### Restoration
- A documented restoration procedure (in `12-deployment-and-operations.md`).
- A restoration drill is performed in the dev environment at least once before MVP go-live.

### Exports
- CSV export available from the UI for: fixtures, results, players, current standings.
- Exports are generated server-side, contain only data the user is authorised to see, and are timestamped.
- Exports do not include audit log entries (a manager-only export will be added in Phase 2).

## Auditability

### What is audited
- Every insert, update, delete on `players`, `results`, `goals`, `cards`, `player_reviews`, `notes`, `match_reports`, `fixtures` (status changes only), `profiles` (role changes only).
- Stored in `audit_log` with table name, row id, action, actor, timestamp, before/after JSON.

### Who can read it
- Manager, in the audit log viewer (Phase 1 includes the database table and a Manager-only screen with filters by table, row, and date).

### Retention
- Minimum two seasons (24 months).
- Audit data is included in backups.
- Audit data is never edited or deleted by the application; only by a manual database operation, which itself is rare and documented.

## Privacy

- The data subject set is small and known: club staff (account holders) and youth players (records, not accounts).
- No personal data is shared with third parties for marketing or analytics.
- Vercel Analytics and Sentry receive aggregated performance and error data only.
- Player photos are private and require Manager-confirmed parental consent.
- Soft-delete is the default for player records; hard delete follows a documented request and is performed manually.
- The privacy posture is documented in `05-user-roles-and-permissions.md` (security considerations for youth player data).

## Reliability

- The app should be available during fixture days (Saturday mornings, May–June 2026). Availability target: 99.5% across that window — equivalent to ~15 minutes of acceptable downtime over a typical match window.
- No deployments are made on Friday evening or Saturday morning during qualifier weekends without rollback plan.
- Preview environments are used to validate every change before it reaches production.

## Maintainability

- TypeScript strict mode.
- ESLint + Prettier.
- A new contributor (or Claude Code session) can run the app locally inside 15 minutes from a fresh clone, given Supabase CLI installed.
- Migrations are append-only and ordered.
- All non-trivial business logic has at least one test.
- Documentation in `docs/` is updated in the same PR as the change it describes.

## Observability

- **Errors:** Sentry (free tier) collects unhandled exceptions, source-mapped.
- **Performance:** Vercel Analytics shows web vitals.
- **Database:** Supabase logs and query insights.
- **Logs in production:** structured JSON via `console.log` in server actions, viewable in Vercel logs.
- **Alerting:** Sentry email alert on new error type; daily Vercel email digest.

## Browser and device support

- Latest two versions of Chrome, Safari, Firefox, Edge.
- iOS 16+, Android 10+.
- The app is not required to function on Internet Explorer, embedded browsers in older Android versions, or devices below 360 px wide.
