# GoodSeed for Teams & Classrooms — design notes

Status: **not building yet.** Waitlist is live on the landing page (`#teams`,
Netlify Forms → `teams-waitlist`). Build when the waitlist shows real demand
and the family product has a few weeks of live usage.

Target buyers: coaches, teachers, youth leaders — aimed at churches, Christian
schools, homeschool co-ops, and youth sports. NOT a head-on ClassDojo
competitor in secular classrooms; the faith angle is the moat.

## Core model

A "group" generalizes the family: owner (coach/teacher) + members (kids) +
points. Families stay as they are; teams/classes are a second group type.

- **Kid codes.** Every child gets a permanent, random, unguessable personal
  code (e.g. `GS-K7M2X`) — never sequential numbers. Shown to parents on the
  kid's profile. Parents can regenerate it if it leaks.
- **Membership, not ownership.** A kid can belong to their family AND any
  number of teams/classes. This is the one real data-model change: a
  memberships table (kid ↔ group) instead of one `family_id` per user.
- **Separate point buckets.** Each group keeps its own balance and its own
  rewards. Team points never mix with family Seeds — a coach's +50 must not
  buy screen time at home. Kid sees tabs: Home 🏡 / Tigers 🏀 / Room 12 📚.

## Parent-approval handshake (verifiable parental consent)

Coach entering a kid code creates a **pending request**, not a membership.

1. Coach adds kid by code → roster shows "Invited — waiting on parent."
2. Parent gets an in-app notification ("Coach Mike from Tigers Basketball
   wants to add Sam") with Approve / Decline. Email with approval link too,
   when the parent has an email on file.
3. Approve → membership created, coach notified. Decline → request removed,
   coach notified.
4. Requests expire after 7 days. Full audit trail: who asked, when, who
   approved.
5. Fallback for in-person sign-ups: parent approves on the coach's device via
   parent PIN/code entry.

Parents always see every group each kid belongs to (Family page) and can
remove the kid at any time. Coaches can remove kids from the roster (end of
season) without touching the family account.

This doubles as the COPPA/consent story when selling to schools and leagues:
no child joins an organization without documented parent approval, and we
hold no child PII (no emails, no passwords for kids).

## Coach experience

- **Quick-tap points screen** is the killer feature: roster of faces, tap a
  kid, +/- points with a reason, two seconds, mid-practice. Deductions
  supported (already have balance adjustments in the family product).
- Roster view, add-by-code, remove, and a simple team leaderboard. No task
  forms required mid-practice.

## Pricing sketch

- "GoodSeed Teams" ~$9.99–14.99/mo per coach/teacher, or a church/school
  license covering multiple groups. B2B-ish buyers tolerate higher prices
  than families.
- Flywheel: every rostered kid sees the product → pulls their family into the
  free plan → some convert to family Plus.

## Open questions

- Do team rewards exist (coach-defined store) or just points/leaderboard v1?
- Kid device story at school (probably: coach device only; kids check at home).
- Whether teams require the kid's family to be on Plus (sync is needed for
  cross-device rosters — likely yes, or Teams includes sync for rostered kids).
