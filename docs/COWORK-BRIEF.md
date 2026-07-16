# GoodSeed — brief for Cowork (revenue model + one-pagers)

## Your two questions, answered

**1. Is family basic free? YES — and it's better than you assumed.**

- Family Free is free forever: 1 parent, up to 2 children, the full
  chore-and-rewards loop, single device.
- **Critically: points always land, free.** The cross-account rollup is
  *recognition*, not a paywalled feature. A kid's soccer/school points flow into
  their home total and grow their level/rank **on the free tier**. The $4.99
  paywall is for multi-device sync, unlimited kids, and co-parents — **not for
  seeing points.**
- So the failure mode you flagged ("25 families hit a $4.99 paywall to see their
  points, pilot dies in week two") **cannot happen.** The classroom works as an
  acquisition engine by construction.

**2. Open to a site tier? YES — and it's already built and live.**

## Current pricing (as of today)

| Tier | Price | Notes |
|---|---|---|
| Family Free | $0 forever | 1 parent, 2 kids, full loop, single device |
| GoodSeed Plus | $4.99/mo | Unlimited kids, co-parents, real-time multi-device sync |
| Teams (self-serve, per coach/teacher) | **$12.99/mo or $119/yr** | 30-day free trial, no card to start |
| Organization | Custom, from ~$1–3/child/mo | **Invoiced annually, no cards.** One code covers every leader |

We took your note on the annual: it was $99 (a 37% discount vs monthly) and is
now **$119** — live and verified in Stripe.

## The cross-account flow (the moat — please make this the headline)

- **One permanent code per child** (`GS-XXXXXX`), reused for **every** group they
  ever join — soccer, school, church, camp. It lives on the child, not the group,
  so joining a 3rd group never mints a 3rd code.
- A coach adds a kid **by that code** → the child auto-links to their family. Or
  **by first name only** — no account, email, or device — which is what makes it
  work for daycares/YMCAs where most kids aren't GoodSeed users.
- Points earned at practice **roll up to the kid's home total and grow their
  level/rank**, and the parent sees them at home next to the points Mom gave for
  the trash — one continuous identity across church, school, field, kitchen.
- **Separate spendable wallets, unified recognition total.** A coach's +50 grows
  the kid's total and rank but is **not** spendable home Seeds — parents keep
  control of their own reward shop. (A coach can never fund home screen time.)
- The parent also sees the coach's announcements at home ("bring cleats," "Joe
  has snack day").

## Organization tier — how it actually works

Built specifically so **volunteers never pay out of pocket**, which is the deal-killer:

1. We create the org → it mints a code (`ORG-XXXXX`).
2. Their administrator distributes that one code.
3. Each coach/teacher enters it once → **their group is covered, free to them.**
   No card, nothing to expense.
4. We invoice the org annually, separately.

- Each leader still keeps their own group code, co-leader code, and kid codes —
  the org code is an extra layer, not a replacement.
- Optional cap on number of groups. Ending an org drops coverage from all its
  groups at once.
- **Deliberately invoiced, not self-serve:** nobody puts $9,600 on a card through
  a checkout page. Schools want an invoice and a PO.

## What's built (so copy is accurate)

**Teams (what a coach gets):** roster by first name; quick-tap points
(+1/+2/+5/+10, −1/−5, custom, with reasons); **whole-group / multi-select
awarding**; one-tap customizable behavior chips (incl. a **Fruit of the Spirit**
pack); leaderboard with 3 display modes (full / top-3 + most-improved / group
total only); **big-screen classroom board** for a TV or projector with points
animating live; **announcements board**; **Toolkit** (random name picker, timer,
team maker, noise meter); local-only roster photos; co-leader code; 30-day trial.

**Family:** tasks + approvals, Seeds, parent-defined rewards shop, streaks,
levels, badges, missions, family goals, Weekly Boss, trading post, daily Bible
verse; **kitchen-screen board** (warm, non-competitive, for a counter tablet);
faith framework — Fruit of the Spirit, growth ranks (Seed → Sprout → Sapling →
… → Mighty Oak), faith badges each carrying a verse.

## Privacy / compliance (use this — it's the real differentiator)

- **Kids: first name only.** No child emails, passwords, phone numbers, or location.
- **No ads, no analytics, no tracking, no data selling** — anywhere in the product.
- Roster **photos are local-only** — stored on the coach's device, never uploaded.
- Kids **cannot sign up alone**; a parent creates the family.
- Delete-everything works (device **and** cloud).
- Public: Privacy Policy with a COPPA children's section, Terms, and a
  plain-English **Parent Promise** page.
- Internal, ready for vendor questionnaires: security one-pager, data-retention
  policy, incident-response plan.
- Florida-based; Texas expansion planned (SCOPE Act). Plan is to adopt the SDPC
  **National DPA (NDPA)** at school sales. **Not signed yet. No SOC 2 yet.**
- We deliberately **do not** build: a photo/video "Stories" feed, student
  portfolios, two-way parent messaging, or a virtual world. Those would blow up
  the privacy posture that makes us sellable to churches and Christian schools.

## Traction — the honest picture (please don't overstate)

- Live at **goodseed-family.netlify.app**. Fully functional, real Stripe billing.
- **A handful of real accounts**, including at least one paid Teams group. Call it
  essentially pre-revenue.
- **Zero pilots run. Zero org deals. Teams waitlist: no signups yet.**
- About to start outbound calls (churches, Christian schools, daycares, YMCAs,
  youth sports) — Florida first.

## The one number that decides the model

Your "25 families per seat → 20% convert → ~$300/classroom" is the crux — and it's
a **hypothesis with zero data behind it.** Nobody has measured our family
conversion rate because no pilot has run. Please build the model with that
conversion rate as an **explicit variable** (show it at 5% / 10% / 20% / 30%)
rather than baking in 20%. The first pilot's job is to measure exactly that
number, and it decides whether the teacher seat should be $119, or free.

## What we'd like from you

1. Revenue model with family-conversion as an explicit sensitivity variable.
2. Both one-pagers rewritten with the **cross-account flow as the first sentence**.
3. Concrete **org pricing bands** — what's a $1,500 account vs a $10,000 one?
   (child count? group count? both?)

## Open decisions / known gaps

- Org pricing bands not set.
- **No org roll-up view for the administrator yet** — a pastor can't log in and
  see all their groups; we see it in our owner console. Fine for the first deals.
- No push notifications (parents see coach announcements when they open the app).
- No parent email/password login → no account recovery yet (password-less by
  design; the family code is the key).
- Custom domain not purchased yet.
