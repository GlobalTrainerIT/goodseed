import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import ErrorBoundary from '@/lib/ErrorBoundary'
import Toaster from '@/components/shared/Toaster'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useCurrentUser } from '@/lib/hooks'
import { runDailyMaintenance } from '@/lib/domain'
import { initSync, teardownSync } from '@/lib/sync'

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
        if (user?.family_id) {
          await initSync(user.family_id)
          if (!cancelled) runDailyMaintenance(user.family_id)
        } else {
          await teardownSync()
        }
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

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/Dashboard" element={<Dashboard />} />
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
