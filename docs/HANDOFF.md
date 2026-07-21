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
- **Bible journey map**: a long-horizon story path (Creation→Noah→…→Empty Tomb,
  `src/lib/journey.js`, 12 stops) each child travels as lifetime `total_seeds_earned`
  crosses each stop's threshold. Fully derived (no new collection). Crossing a
  stop fires an activity + notification + toast (hook in `awardSeeds`; recognition
  only, no bonus). Read-only `BibleJourney` card on ChildHome + ChildProfile
  (current stop, road to next, whole trail). Capstone badge `journey_complete`
  (The Whole Story, at 1600 — mirror the final threshold if you retune journey.js).
  Settings: enable toggle.
- **Family Altar** (weekly co-op devotional): a whole-family weekly devotional
  (`src/lib/altar.js`, 5 steps) reusing the Weekly-Boss co-op idea. Anyone in the
  family checks off steps together; finishing all 5 lights the altar → every
  child earns the reward once + a shared activity, keyed per ISO week in
  `familyAltar` (syncs). Consecutive-week streak. 2 badges (Family Altar,
  Faithful Household 4-wk). Interactive `FamilyAltar` card on Dashboard +
  ChildHome (both parent and child can check steps — shared state); 🕯️ status
  line on the kitchen board. Settings: enable + reward. Completion is idempotent
  (awards once/week even if steps are toggled). Logic in `domain.js`.
- **Skylight calendar slice** (family command-center): dated events ride the
  announcements layer — an announcement with `event_date`/`event_time` is an
  event (`src/lib/events.js` helpers). Coach **Board** post form gained an
  optional date+time → dated posts show in an "Upcoming events" section; family
  **Dashboard** has an `UpcomingEvents` agenda card (parents add family events via
  a dialog); both **Display** boards show a weekly agenda; the family agenda +
  kitchen board also merge events from **followed groups' snapshots**
  (`snapshots[code].announcements`) — so a coach's dated post lands on a following
  family's calendar through the same channel notices already use. NOTE: the
  cross-family hop depends on the `group-link` edge fn returning `event_date` on
  announcement rows (verify/ensure it passes the field through). Only locally-
  testable surfaces (same-family add→agenda→board, group Board+Display) verified.
- **Recurring events + month Calendar**: events can `repeat: 'weekly'`
  (`expandInRange` in events.js unrolls occurrences); shared `AddEventDialog` has
  a "repeat weekly" box (family agenda + coach Board). New `/Calendar` page
  (`src/pages/Calendar.jsx`) — a month grid of family + followed-group events,
  parent-only, in PARENT_NAV; the Dashboard agenda links to it.
- **Family notes lane**: a shared sticky-note message board (`familyNotes`
  collection, syncs). `NotesLane` card on the Dashboard + ChildHome — anyone
  posts a color-coded note (4 colors); notes render as sticky cards on the
  kitchen board (colors shared via `noteCard()` from NotesLane). Settings: enable
  toggle. Logic in `domain.js` (`addNote`/`removeNote`/`familyNotesList`).
- **Family photo frame** (Skylight signature): a rotating kitchen-board photo
  frame. Photos are local-only (`src/lib/familyPhotos.js`, localStorage, capped
  at 12, downscaled JPEGs — same privacy model as roster photos, never synced).
  `PhotoLane` card on the Dashboard (parents add/remove); `FamilyPhotoFrame`
  cross-fades them on the Display board every 7s. Settings: enable toggle.
  Note: the auto-rotate timer can't be exercised in a headless hidden tab (Chrome
  throttles hidden-page timers) — verified render/cross-fade/add-remove; rotation
  works on a real visible display.
- **Shared to-do lane**: a lightweight family checklist (`todos` collection),
  distinct from `tasks` (the seed-earning chore engine) — no seeds/approval.
  `TodoLane` card on the Dashboard + ChildHome (both parent and child can add,
  check, assign to a member, and "Clear done" — shared family state); open items
  show on the kitchen board. Settings: enable toggle. Logic in `domain.js`
  (`addTodo`/`toggleTodo`/`removeTodo`/`clearDoneTodos`).
- **Weekly meal plan** (Skylight lane): a per-week B/L/D planner (`src/lib/meals.js`
  + `meals` collection, keyed by concrete date). `MealPlan` card on the Dashboard
  (parents type into inline slots; blank clears the slot); read-only elsewhere;
  "🍽️ Tonight's dinner" line on the kitchen board. Settings: enable toggle.
  Logic in `domain.js` (`setMeal`/`mealText`/`mealsForDate`).
- **Faith Journey stats panel**: `FaithStats` card on ChildProfile aggregates
  verses/armor/fruits/gratitude/journey/altar (helper `faithStats` in domain);
  tiles respect each feature's enable setting.
- **Settings "Faith & Devotion" card**: the 6 faith toggles + rewards moved out
  of the Gamification card into their own section.
- **Fixes**: (1) `checkBadges` re-entrancy — a badge's `bonusSeeds` award
  re-enters checkBadges and the stale `owned` set could double-create a later
  badge; now guarded with a live-store existence check before create. (2)
  `KidCodeRow` setState-in-render — `ensureKidCode` wrote to the store during
  render; now deferred to a `useEffect`. (3) `group-link` edge fn now returns
  `event_date`/`event_time` on announcements (SOURCE fixed; **deploy pending** —
  see task/gaps).
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
   - ✅ **Bible journey map** — BUILT (see Major systems).
   - ✅ **Family altar (co-op)** — BUILT (see Major systems). The faith set is
     now complete: Verse of the Week, Armor of God, Fruit garden, Gratitude jar,
     Bible journey, Family Altar.
2. ✅ **Skylight-Calendar slice** — BUILT: dated events, agendas, recurring
   (weekly) events, and a month-grid `/Calendar`. **DEPLOY PENDING**: the
   `group-link` edge fn source now returns `event_date`/`event_time`, but it must
   be deployed to Supabase (matching its current `verify_jwt=false`) for coach
   events to reach families cross-family — see the spawned task. Meal-plan lane
   now BUILT (see Major systems), and the shared to-do lane too — the family
   command-center is now agenda + month calendar + meal plan + to-do list.
   Photo frame + family notes lane now BUILT too — the command-center is
   feature-complete (calendar/events, month view, meal plan, to-dos, photos,
   notes). **Event click-to-edit** also done: tapping an event on /Calendar or
   the dashboard agenda opens `AddEventDialog` in edit mode (update in place +
   Delete); recurrence occurrences resolve to their base record (via
   `getById`) so edits/deletes apply to the whole series. **Per-occurrence
   delete/edit/move** all done via an `overrides`/`exceptions` model on the
   record (see events.js `expandInRange` + domain `overrideEventDay`/`moveEvent`):
   editor offers "Delete this day" vs "Delete series", plus a "Change only this
   day" checkbox that writes a per-date title/time/notes override; the /Calendar
   grid supports **drag-to-reschedule** (drop moves a one-off's date, or one
   recurring occurrence via a date override) and **shows each day's dinner**
   (🍽️) from the meal plan. Follow-ons (minor): meal/to-do editing from the
   calendar; touch-drag (native HTML5 DnD is mouse-only).

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
