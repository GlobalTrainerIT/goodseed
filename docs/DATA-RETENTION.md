# GoodSeed — Data Retention & Deletion Policy

*Internal policy. Public-facing summary lives in privacy.html. Last updated
July 13, 2026.*

| Data | Where | Retained | Deleted when |
|---|---|---|---|
| Family/app data (profiles, tasks, points) | Device localStorage + Supabase `records` (Plus) | While the family uses GoodSeed | Parent deletes child profile (that child's rows) or the family (Settings → Delete family → purges cloud rows, then device) |
| Anonymous device identities + family membership | Supabase auth / `family_members` | While the device is in use | Orphaned after family deletion; periodically pruned |
| Subscription status | Supabase `subscriptions` | While subscribed + as needed for records | On family deletion request (Stripe retains its own financial records as legally required) |
| Payment/card data | Stripe only — never on our systems | Per Stripe's PCI-compliant retention | Managed by Stripe |
| Teams waitlist emails | Supabase `waitlist` | Until Teams launches | At launch (migrated to invited users) or on request |
| Database backups | Supabase automated backups | ~7-day rolling window | Automatic age-out |

## Principles
1. **Deletion is real.** "Delete family" removes data from the device AND the
   cloud database, immediately, with no recovery window on our side.
2. **Minimum collection = minimum retention.** We can't leak or over-retain
   what we never collected (no child emails/passwords/location).
3. **Requests.** Parents can also request deletion by email; verify the
   requester controls the family (invite code or subscription email) before
   acting. Target turnaround: 7 days.
4. Review this policy whenever a new collection point ships (e.g., Teams).
