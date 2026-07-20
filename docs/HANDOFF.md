# GoodSeed — session handoff

Read this first in a new session. Also read: `docs/COWORK-BRIEF.md`,
`docs/TEAMS-DESIGN.md`, and the memory files under the project memory dir.

## What GoodSeed is
Faith-based family chore/rewards web app (Vite + React + local-first store in
`src/lib/db.js`, optional Supabase sync). Live at goodseed-family.netlify.app.
Deploys via GitHub → Netlify. **The user pushes via GitHub Desktop** (I commit;
I cannot push). Supabase project ref: `jedqarsyvrpicvlztyrm`.

## Business model (current)
- Family Free (forever) → Plus $4.99/mo (sync, unlimited kids, co-parents).
- Teams (per leader): $12.99/mo or **$119/yr**, 30-day trial. **One leader =
  one subscription**, covers ALL their teams.
- Organization: invoiced, ~$1–3/child/yr. One code covers every leader.
- Points always land free (rollup is recognition, not a paywalled feature).

## Major systems built (all live + tested)
- **Groups** = families with `kind:'group'`. Coach onboarding, /Roster quick-tap
  points, behavior chips (incl. Fruit of the Spirit), /Leaderboard (3 modes),
  /Board announcements, /Toolkit (random pick, timer, team maker, noise meter),
  /Display big-screen (classroom board + warm family kitchen board), local-only
  roster photos.
- **Kid codes** (`GS-XXXXXX`): one permanent code per child, reused for every
  group; coach "Add by code" auto-links to the family; parent auto-discovers
  groups. Edge fn `kid-code`. Table `kid_links`.
- **Rollup**: a kid's group points grow their home total & level/rank but are
  NOT spendable home Seeds (parents keep the reward shop). `src/lib/groupLink.js`.
- **Multiple teams per coach**: `owner_key` on each group, device-local team
  list, TeamSwitcher bar. `src/lib/teams.js`, `createCoachGroup()`.
- **Coverage follows the leader**: edge fn `leader-coverage` spreads paid/org
  coverage across all a leader's teams (propagated comped rows,
  `subscriptions.propagated`). Called on create-team, org-join, checkout, load.
- **Organizations**: `organizations` table (code + separate admin_key),
  `org-join` edge fn (leader covers their group), `org-admin` edge fn + `/OrgAdmin`
  page (administrator roll-up), Owner Console `/Admin` create/revoke orgs.
- **Owner Console** `/Admin` (owner admin key `gsk_...`, in the user's password
  manager): MRR, families/groups/orgs, comp/grant, create orgs.
- **Billing**: Stripe live. create-checkout (plans: plus, teams_monthly
  price_1Ttg1ZC3XE1lnObG71CATYSX, teams_yearly price_1Ttp2ZC3XE1lnObGwWOxIN0e),
  stripe-webhook, create-portal. Old $99 price retired but still mapped.
- **Faith**: `src/lib/faith.js` — Fruit of the Spirit pack, level ranks
  (Seed→Sprout→…→Mighty Oak), 5 faith badges w/ verses (in `src/lib/badges.js`).
- **Compliance/pages**: /privacy (COPPA section), /terms, /parent-promise,
  /for-teams sales page. Internal docs in `docs/`.

## NEXT UP (user greenlit)
1. **Verse of the Week / Scripture-memory challenge** (highest value — widens
   the one axis ClassDojo can't touch). Spec: a rotating weekly memory verse;
   a leader/parent marks a kid "memorized" → awards points (+ a faith badge for
   streaks of weeks). Group + family. Reuse `src/lib/verses.js` (has VERSES +
   getVerseForDate). Consider a `memoryVerses` setting or a small schedule.
   Show on Roster/Board (groups), Dashboard/kitchen board (family).
2. **Skylight-Calendar-style expansion** (user idea). Skylight = wall/counter
   touchscreen family organizer: shared calendar, chores, meal plan, to-dos,
   photos. GoodSeed already has the kitchen board. Best crossover, and it's ON
   the cross-context moat: **events flow group→family** — a coach posts
   "Saturday game 9am" and it lands on the family's kitchen calendar. Build a
   dated-events layer on the announcements Board + a weekly agenda on the
   kitchen/Display board. Don't rebuild a full calendar app; do the family
   command-center slice that ties to what we have.

## Open decisions / known gaps (tell a new session)
- **Solo teacher-seat pricing** vs free ClassDojo: leaning free/freemium solo,
  firm on org. Decide WITH Cowork (feeds their model). Not yet changed.
- **SDPC National DPA (NDPA): planned, NOT signed.** Adopt before school calls.
- **No account recovery** (password-less; family/kid codes are the key). Manual
  support only. Parent email/password login is the proper fix (post-launch).
- **Kid codes + team switcher are device-local** — no multi-device coach account
  yet. Fine for one-phone coaches.
- **No push notifications** (parents see coach announcements on app open).
- Pilots: ZERO run. Waitlist: no signups. Essentially pre-revenue.
- Custom domain not purchased. Old $99 Stripe price should be archived.

## Gotchas learned this build
- Store stamps `created_date` (not `created_at`). Reading the wrong one made the
  trial never expire — check field names.
- `fetchServerPlan` returns null for any family without a subscription row
  (every trial group). Don't gate teardown/sync on it.
- supabase `subscribe()`: remove stale channel for a topic before re-listening.
- Register sync push handlers BEFORE the network round-trips in initSync.
- Rapid create-then-clear in tests races the demo seeding; restart dev server to
  flush stale HMR module instances.
