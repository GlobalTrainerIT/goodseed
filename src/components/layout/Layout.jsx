import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import BottomTabBar from './BottomTabBar'
import AnnouncementBanner from './AnnouncementBanner'
import { PARENT_TABS, CHILD_TABS, GROUP_TABS } from './navConfig'
import { useCurrentUser, useSettings, useRecord } from '@/lib/hooks'
import { isGroup } from '@/lib/plan'
import ErrorBoundary from '@/lib/ErrorBoundary'
import NotificationBell from '@/components/notifications/NotificationBell'
import ParentPinGate from './ParentPinGate'
import SyncIndicator from './SyncIndicator'
import { useUnlocked } from '@/lib/pinLock'

export default function Layout() {
  const user = useCurrentUser()
  const settings = useSettings()
  const unlocked = useUnlocked()
  const family = useRecord('families', user?.family_id)
  const isChild = user?.role === 'child'
  const tabs = isGroup(family) ? GROUP_TABS : isChild ? CHILD_TABS : PARENT_TABS

  // Parent PIN gate for shared-device mode.
  if (!isChild && settings.parentPinEnabled && settings.parentPin && !unlocked) {
    return <ParentPinGate pin={settings.parentPin} />
  }

  return (
    <div className="min-h-screen bg-seed-50 dark:bg-gray-950">
      {!isChild && <Sidebar />}
      <MobileHeader />

      <div className={isChild ? '' : 'lg:pl-[280px]'}>
        {/* Desktop top bar with bell (parent only) */}
        {!isChild && (
          <div className="sticky top-0 z-20 hidden items-center justify-end gap-2 border-b border-gray-100 bg-seed-50/80 px-6 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80 lg:flex">
            <SyncIndicator />
            <NotificationBell />
          </div>
        )}
        <AnnouncementBanner />
        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 lg:pb-10">
          <ErrorBoundary label="page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <BottomTabBar tabs={tabs} />
    </div>
  )
}
