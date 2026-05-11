# 01 — Product Overview

## Purpose

Kickstart Rush is the internal operations app for Kickstart Football Club. It replaces a scatter of WhatsApp messages, paper notes, screenshots of fixture sheets, and ad-hoc spreadsheets with a single source of truth for two squads competing in the BFA National Youth Tournament 2026:

- **Kickstart Elite** — U15 Zone A qualifiers
- **Kickstart Premier** — U15 Zone B qualifiers

The app is for the people who run the club — the manager, coaches, and supporting staff. It is not a public-facing site. There is no marketing, no parent portal, no spectator features in MVP.

## Problem statement

The club currently operates without a structured system. Specific pain points:

- **Fixture awareness is fragile.** Coaches and players rely on paper schedules and group chats. A change in venue or kick-off time travels unevenly.
- **Results and standings are not tracked centrally.** Position in the league is calculated by eye, not from data. There is no historical record after the season.
- **Player development is undocumented.** Observations from training and matches live in coaches' heads or in private notebooks. There is no longitudinal record of how a player has progressed.
- **Match reports are inconsistent.** Some games are written up, most are not. The ones that exist are not searchable.
- **Availability and selection are managed by memory.** Who is injured, who is on holiday, who has school commitments — none of it is captured systematically.
- **There is no audit trail.** When a result or rating is changed, no one knows who changed it, when, or why.

The qualifying tournament runs across May and June 2026, with eight teams in each zone playing seven fixtures each. The top four advance to the Super 8; the bottom four go to the Plate stage. The window for the club to operate at a higher level is now.

## Goals

1. **Single source of truth** for fixtures, results, standings, players, and observations across both squads.
2. **Mobile-friendly** so coaches can record availability and post-match observations from a phone at the venue.
3. **Standings calculated from data** — no manual scoreboard maintenance.
4. **Longitudinal player records** — every player has a profile that grows over the season with reviews, ratings, minutes, and notes.
5. **Auditable changes** — every edit to a result or player review is logged with who and when.
6. **Practical to ship** — a working MVP within 30 days, built incrementally with Claude Code.
7. **Future-ready** — clean enough to add Microsoft Entra ID auth, parent access, and dashboards in later phases without rework.

## Non-goals

The following are explicitly **out of scope** to keep the project realistic:

- A public website or fan-facing experience.
- Parent or player accounts in MVP.
- Live match commentary or in-game ticker.
- Video upload, video analysis, or training-clip libraries.
- Financial tracking — fees, subscriptions, payments.
- Equipment or kit inventory management.
- Multi-club / SaaS tenancy. This is a single-club app.
- Native iOS or Android apps. Mobile web only.
- Wearable integration, GPS tracking, or biometric data.

These are not bad ideas. They are simply not MVP.

## Primary users

| User | Role in the club | What they need from the app |
|------|------------------|------------------------------|
| **Club Manager** | Owner of the programme; sets up squads, oversees both teams | Full access; can do everything; sees both squads at a glance |
| **Head Coach (per squad)** | Runs training and selection for one squad | Edits their squad's fixtures, results, reviews, availability |
| **Assistant Coach / Staff** | Supports the head coach; sometimes records data on the touchline | Limited editing; mostly attendance, observations, draft reports |
| **Viewer** | Trusted club staff who need read-only visibility (e.g. board observer) | Read everything, edit nothing |

Roles are explored in detail in `05-user-roles-and-permissions.md`.

## Key use cases

1. **Pre-match preparation** — A coach checks the next fixture, marks player availability, and reviews the last result against the same opponent if one exists.
2. **Post-match data entry** — Within 24 hours of full-time, the coach records the final score, scorers, minutes played, cards, and a short match report. Standings update automatically.
3. **Mid-season player review** — Once a month, each coach completes a short structured review per player covering technical, tactical, physical, and attitudinal dimensions.
4. **Player development check-in** — The manager opens a player profile to see how their ratings and minutes have trended across the season.
5. **Standings check** — Anyone with access can see the live league table for their zone, with form (last five), goal difference, and points.
6. **Squad availability snapshot** — Before training or a match, the coach sees a one-screen view of who is available, injured, suspended, or unavailable, with reasons and dates.
7. **Note capture** — A coach observes something in training ("X is starting to read the press well") and captures it against that player in under 30 seconds.

## Success measures

The MVP is successful if, by the end of the U15 qualifiers (end of June 2026):

- **100% of fixtures** for both squads have a result recorded in the app within 48 hours of full-time.
- **Standings in the app** match the official BFA standings for both zones, with no manual override needed.
- **Every active player** has at least one structured review recorded during the qualifying period.
- **Coaches use it on a phone.** At least 50% of result entries and observations are submitted from a mobile device.
- **No data has been lost.** A weekly export is in place and verified.
- **The manager can answer "how is player X progressing?"** in under one minute, using only the app.

Phase 2 success measures will introduce dashboard usage, role-based access uptake, and Entra ID adoption.

## Assumptions

- One club, two squads, ~16–25 players per squad in MVP.
- ~7 group-stage fixtures per squad in qualifiers, plus knockout rounds.
- The manager is technically capable, comfortable with GitHub and Vercel dashboards, and is the primary product owner.
- The club has Office 365 / Azure available, but the MVP will not depend on it.
- Internet connectivity at venues (Blenheim and BFA Technical Centre) may be patchy; the app should not require live connectivity to view data already loaded, though writes can require connectivity in MVP.
