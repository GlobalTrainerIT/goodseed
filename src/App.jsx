import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import ErrorBoundary from '@/lib/ErrorBoundary'
import Toaster from '@/components/shared/Toaster'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useCurrentUser } from '@/lib/hooks'
import { runDailyMaintenance } from '@/lib/domain'
import { initSync, teardownSync } from '@/lib/sync'
import { getById, update } from '@/lib/db'
import { isPlus, teamsActive } from '@/lib/plan'
import { fetchServerPlan } from '@/lib/billing'

// Route-level code splitting keeps the initial bundle small; heavy pages
// (Reports → recharts, jsPDF) only load when visited.
const Welcome = lazy(() => import('@/pages/Welcome'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const ProfileSetup = lazy(() => import('@/pages/ProfileSetup'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Tasks = lazy(() => import('@/pages/Tasks'))
const Rewards = lazy(() => import('@/pages/Rewards'))
const Missions = lazy(() => import('@/pages/Missions'))
const Family = lazy(() => import('@/pages/Family'))
const Reports = lazy(() => import('@/pages/Reports'))
const TradingPost = lazy(() => import('@/pages/TradingPost'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotificationCenter = lazy(() => import('@/pages/NotificationCenter'))
const ChildProfile = lazy(() => import('@/pages/ChildProfile'))
const Roster = lazy(() => import('@/pages/Roster'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard'))
const Board = lazy(() => import('@/pages/Board'))
const Display = lazy(() => import('@/pages/Display'))
const Admin = lazy(() => import('@/pages/Admin'))

function RequireAuth({ children }) {
  const user = useCurrentUser()
  const location = useLocation()
  if (!user) return <Navigate to="/Welcome" replace state={{ from: location }} />
  return children
}

/** Parent-only pages (child management, reports) — children are redirected home. */
function RequireParent({ children }) {
  const user = useCurrentUser()
  if (user && user.role !== 'parent') return <Navigate to="/Dashboard" replace />
  return children
}

/** Wrap a page in its own error boundary so a single page crash can't blank the app. */
function Page({ label, children }) {
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>
}

export default function App() {
  const user = useCurrentUser()

  // Start multi-device sync for the active family (no-op without a backend or
  // for the local-only demo family), then run once-per-day maintenance
  // (recurring rollover, streak savers, weekly leaderboard snapshot).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const fid = user?.family_id
        if (!fid) {
          await teardownSync()
          return
        }
        // Reconcile the plan from the server (Stripe-authoritative once billing
        // is live), so an upgrade unlocks Plus on every device.
        const serverPlan = await fetchServerPlan(fid)
        if (!cancelled && serverPlan) {
          const fam = getById('families', fid)
          if (fam && (fam.plan || 'free') !== serverPlan) update('families', fid, { plan: serverPlan })
        }
        // Cloud sync is a Plus feature for families; groups sync while their
        // Teams plan or trial is active. Free families stay on-device.
        const fam = getById('families', fid)
        if (!cancelled && (isPlus(fam) || teamsActive(fam))) await initSync(fid)
        // Re-assert the server-authoritative plan after sync: a stale remote
        // family row must not downgrade what Stripe or the owner granted.
        if (!cancelled && serverPlan) {
          const after = getById('families', fid)
          if (after && (after.plan || 'free') !== serverPlan) update('families', fid, { plan: serverPlan })
        }
        else await teardownSync()
        if (!cancelled) runDailyMaintenance(fid)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[App sync/maintenance]', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.family_id])

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/Welcome" element={<Page label="Welcome">{user ? <Navigate to="/Dashboard" replace /> : <Welcome />}</Page>} />
          <Route path="/Onboarding" element={<Page label="Onboarding"><Onboarding /></Page>} />
          <Route path="/Admin" element={<Page label="Admin"><Admin /></Page>} />
          <Route path="/Display" element={<Page label="Display"><RequireAuth><Display /></RequireAuth></Page>} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/Roster" element={<RequireParent><Roster /></RequireParent>} />
            <Route path="/Leaderboard" element={<Leaderboard />} />
            <Route path="/Board" element={<RequireParent><Board /></RequireParent>} />
            <Route path="/Tasks" element={<Tasks />} />
            <Route path="/Rewards" element={<Rewards />} />
            <Route path="/Missions" element={<Missions />} />
            <Route path="/Family" element={<RequireParent><Family /></RequireParent>} />
            <Route path="/Reports" element={<RequireParent><Reports /></RequireParent>} />
            <Route path="/TradingPost" element={<TradingPost />} />
            <Route path="/Settings" element={<Settings />} />
            <Route path="/ProfileSetup" element={<ProfileSetup />} />
            <Route path="/NotificationCenter" element={<NotificationCenter />} />
            <Route path="/ChildProfile/:id" element={<ChildProfile />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? '/Dashboard' : '/Welcome'} replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  )
}
