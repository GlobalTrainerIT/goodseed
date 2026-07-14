# GoodSeed — Incident Response Plan

*Internal. Last updated July 13, 2026. Owner: founder (sole operator).*

## What counts as an incident
- Unauthorized access to the database or a Supabase/Netlify/Stripe/GitHub account
- A vulnerability that exposes one family's data to anyone outside that family
- Leaked credentials (service keys, webhook secrets, deploy tokens)
- Extended outage of sync or billing

## Response steps
1. **Contain (first hour).**
   - Rotate the affected credential immediately: Supabase service key / Stripe
     keys & webhook secret / Netlify + GitHub tokens.
   - If the database is at risk: pause the Supabase project (Dashboard →
     Pause) — the app degrades to local-only mode by design and keeps working.
2. **Assess (same day).** Check Supabase logs and Stripe events: what was
   accessed, which families, what data classes (names/avatars/activity —
   remember: no child emails, passwords, or location exist to leak).
3. **Fix.** Patch the vulnerability, restore from backup if data integrity is
   affected, verify RLS isolation with the standard member/non-member tests.
4. **Notify.**
   - **Florida law (Fla. Stat. § 501.171):** notify affected individuals within
     30 days of determining a breach occurred (500+ Floridians affected also
     requires notifying the FL Department of Legal Affairs).
   - **COPPA lens:** if children's data was involved, notification to parents
     is the priority; be specific about what was and wasn't exposed.
   - Use plain, honest language; email affected parent addresses; post a notice
     in-app/on the site for families without an email on file.
5. **Write it down.** Date, cause, scope, fix, notifications sent — kept in
   this repo (private) as `docs/incidents/YYYY-MM-DD.md`.

## Contacts
- Supabase support: support@supabase.com (dashboard → Support)
- Stripe: dashboard → Help
- Netlify: app.netlify.com → Support
- Ed-tech/privacy attorney: (add after engagement)
