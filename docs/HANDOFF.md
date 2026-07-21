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
- **Verse of the Week** (Scripture-memory challenge): rotating weekly verse
  (`getVerseForWeek`/`weekKey` in `src/lib/verses.js`), leader/parent marks a kid
  "memorized" → awards configurable seeds + grows a consecutive-week streak;
  records in the `memoryVerses` collection (syncs). 3 verse badges (Word Planted,
  Scripture Keeper 4-wk, Hidden in the Heart 12-verse). Reusable
  `VerseChallenge` card on coach Roster + family Dashboard; weekly verse + 📖
  memorized marks on both Display boards. Settings: enable + reward amount.
  Logic in `domain.js` (`markVerseMemorized`/`unmarkVerseMemorized`/streak).
- **Armor of God** (daily devotion, family-only): 7-piece collectible set
  (Ephesians 6, `src/lib/armor.js`). Kid self-checks "put on today's armor" →
  pending; parent confirms (or marks directly). Each confirmed day = next piece
  + seeds; all 7 = a full suit → escalating bonus + badge, then a new suit at a
  higher tier (Bronze→Silver→Gold→Champion). Daily streak. 3 badges (Armor
  Bearer, Fully Armored, Daily Devotion 7-day). `armorPieces` collection (syncs).
  Role-aware `ArmorOfGod` card: child self-view in ChildHome, parent
  confirm-panel on Dashboard; 🛡️ pill on the kitchen board. Settings: enable +
  per-piece reward. Logic in `domain.js` (`kidMarkArmor`/`confirmArmor`/…).
- **Fruit of the Spirit garden**: the 9 Fruits (Galatians 5:22–23, already in
  `faith.js`) as a per-child collectible. Awarding a Fruit-named behavior grows
  that fruit — hooked in `awardSeeds` (matches `reason` to a Fruit label), so the
  coach Fruit behavior-pack presets grow it for free; the garden picker
  (`awardFruit`) is the direct path. `fruitEarned` collection (syncs). 2 badges
  (Good Fruit 5, Flourishing Tree 9). `FruitGarden` card: interactive on
  ChildProfile (parent taps), read-only on ChildHome; 🌳 pill on the kitchen
  board. Settings: enable toggle. Logic/counts in `domain.js`.
- **Gratitude jar** (prayer/gratitude daily habit): a child (or parent, for
  them) adds a short "thankful for" or "prayed for" note. The first note each day
  grows a daily streak + awards a small reward; notes collect into a jar. 3
  badges (Grateful Heart, Thankful Every Day 7-day, Overflowing 30). `gratitude`
  collection (syncs). `GratitudeJar` card: interactive on ChildHome (child adds
  own) + ChildProfile (parent adds), read-only display elsewhere; a shared 💛
  jar strip on the kitchen board (all kids' recent notes with names). Settings:
  enable + reward. Logic in `domain.js` (`addGratitude`/`gratitudeStreakDays`/…).
- **checkBadges re-entrancy fix**: a badge's `bonusSeeds` award re-enters
  checkBadges; the outer loop's stale `owned` set could double-create a later
  badge (exposed when Verse/Armor/Fruit bonus badges fire together). Now guarded
  with a live-store existence check before create.
- **Compliance/pages**: /privacy (COPPA section), /terms, /parent-promise,
  /for-teams sales page. Internal docs in `docs/`.

## NEXT UP (user greenlit)
1. ✅ **Verse of the Week / Scripture-memory challenge** — BUILT (see Major
   systems above). Possible follow-ons if wanted: custom per-group verse
   schedule (pick the week's verse instead of auto-rotation); let kids
   self-report memorized (parent/coach confirms); a "verses memorized" stat on
   ChildProfile/Reports; badge for a longer streak.
1b. ✅ **Armor of God daily challenge** — BUILT (see Major systems). User
   greenlit the whole faith-gamification direction ("I like all these ideas").
   Backlog of the ideas they liked, in fit order:
   - ✅ **Fruit of the Spirit garden** — BUILT (see Major systems). Follow-ons:
     surface the garden on the coach/group side too (currently family-only
     display; group awards still grow it via the awardSeeds hook); a tree that
     visually blossoms more as fruit counts rise.
   - ✅ **Prayer / gratitude jar** — BUILT (see Major systems).
   - **Bible journey map**: milestone path (Creation→Noah→Moses→David→Jesus) that
     unlocks as kids accumulate seeds or memorize verses. Long-horizon goal.
   - **Family altar (co-op)**: a weekly devotional the whole family completes
     together — reuse the existing Weekly Boss co-op mechanic.
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
