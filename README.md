# 🌱 GoodSeed — Family Rewards

A faith-based family chore & rewards app. Parents manage tasks and rewards;
children complete tasks to earn **Seeds** (🌱), the in-app currency. Built around
encouragement, gentle gamification, and a daily Bible verse.

> _"Plant good seeds, watch your family grow."_

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

The app pre-loads a **demo family** on first launch so every page has data.

- **Parent:** choose “I'm a Parent” to create a new family, or open the app and
  it logs you into the demo parent.
- **Child:** choose “I'm a Child” and enter invite code **`DEMO01`**, then pick a
  child profile (Sam, Jordan, or Riley).

Everything is stored in `localStorage` — the app works fully offline and resets
to demo data if storage is cleared.

## Tech stack

- **React 18** + **React Router v6** (client-side routing)
- **Tailwind CSS** (class-driven dark mode — no system auto-detect, no flicker)
- **Recharts** for the Reports charts
- **lucide-react** icons · **date-fns** dates
- **@tanstack/react-query** provider · **@dnd-kit** · **jsPDF + html2canvas** (lazy-loaded for PDF export)
- **Vite** build tool

## Architecture

```
src/
  lib/            db (reactive localStorage store), auth, domain logic,
                  hooks, toast, theme, verses, badges, constants, ErrorBoundary
  components/     ui (shadcn-style primitives), layout, dashboard, tasks,
                  rewards, family, gamification, notifications, child, shared
  pages/          Welcome, Onboarding, ProfileSetup, Dashboard, Tasks, Rewards,
                  Missions, Family, Reports, TradingPost, Settings,
                  NotificationCenter, ChildProfile
```

**Data layer** (`lib/db.js`) is a reactive store: each collection is an array in
memory that persists to `localStorage` on write and notifies subscribers via
`useSyncExternalStore` (see `lib/hooks.js`), so any mutation re-renders the UI in
real time. **Business rules** (seeds, streaks, XP/levels, badges, approvals,
redemptions, goals, weekly boss, missions) live in `lib/domain.js`.

### Reliability guardrails
- Every page route is wrapped in its own **class-based `ErrorBoundary`** (plus a
  top-level one) so a single page crash never blanks the app.
- No sub-components are defined inside parent render functions (avoids remounts).
- `useEffect` side-effects that touch app state are wrapped in `try/catch`.
- Dark mode is applied via the `.dark` class only — never `prefers-color-scheme`.
- Sidebar is `z-30`; modals/sheets are `z-50`; toasts `z-60`; confetti `z-70`.

## Features

**Core:** parent & child roles · task CRUD + approval flow · reward catalog +
redemption flow · seed award/deduct · family leaderboard · daily Bible verse ·
shout-outs · activity feed · family goals (with child contributions) · weekly
boss challenge · announcements (with dismissible banner) · reports with charts +
PDF/CSV export · trading post · notifications center.

**Gamification:** streaks (🔥) · XP & levels with level-up celebration · 12
earnable badges · seed packs with an animated reveal · streak savers · confetti
on missions/goals/boss defeat.

**Extras:** user-controlled dark mode · dedicated child UI · simulated push
toasts · calendar view for tasks · task search/filter · **drag-and-drop task
reordering** (`@dnd-kit`) · **photo-proof uploads** on task submission (downscaled
to keep storage small) · **daily maintenance** that rolls recurring task due-dates
forward, auto-protects streaks with savers, and grants weekly savers · **weekly
leaderboard snapshots** with a "last week's winner" badge · **enforced 4-digit
parent PIN** gate for shared-device mode · invite-via-link (`?join=CODE`) ·
renamable currency.
