# GoodSeed — Security Overview (vendor one-pager)

*The answers schools, churches, and organizations ask for in vendor security
questionnaires. Last updated July 13, 2026.*

**Product:** GoodSeed, a faith-based family chore & rewards web app (PWA).
GoodSeed for Teams & Classrooms (coaches/teachers) is in development.

## Data we handle
- Child data is minimal by design: first name/nickname, optional age, avatar
  (emoji or parent-added photo), and in-app activity (tasks, points, streaks).
- No child emails, passwords, phone numbers, or location. Children authenticate
  via a parent-controlled family code, never credentials.
- Parent data: name, optional email, subscription status.
- No advertising, no analytics trackers, no data sale or sharing for marketing.

## Architecture & hosting
- Web app served by Netlify (CDN). Database & auth: Supabase (PostgreSQL,
  hosted on AWS, United States).
- Local-first: free-plan family data lives only on the family's own device.
  Paid (Plus) families sync through the database for multi-device use.
- Payments: Stripe hosted checkout. Card data never touches our systems
  (PCI DSS handled by Stripe).

## Access controls
- Database enforces row-level security scoped to family membership: a device
  must join a family with its invite code before it can read or write that
  family's rows. Verified by testing: non-members and bare API keys receive
  no data and cannot modify or delete another family's rows.
- Subscription records are server-authoritative: written only by a
  signature-verified Stripe webhook using service credentials; clients are
  read-only.

## Encryption
- In transit: HTTPS/TLS on all endpoints (site, API, database, payments).
- At rest: database encryption at rest (AES-256, managed by Supabase/AWS).

## Data retention & deletion
- See [DATA-RETENTION.md](DATA-RETENTION.md). Summary: parents can permanently
  delete a child profile or the entire family in-app; deletion covers both the
  device and the cloud database. Backups age out within ~7 days.

## Incident response
- See [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md). Florida breach-notification
  law (Fla. Stat. § 501.171) governs our notification obligations.

## Roadmap items (honest gaps)
- SOC 2 is not yet in place (planned when organizational sales justify it).
- Formal DPA for schools: we adopt the SDPC National DPA (NDPA) at Teams launch.
