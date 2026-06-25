import { CloudOff, RefreshCw } from 'lucide-react'
import { useSyncStatus, retrySync } from '@/lib/sync'

/**
 * Small chip shown only when the cloud backend is unreachable. The app keeps
 * working on-device; tapping retries the connection.
 */
export default function SyncIndicator() {
  const status = useSyncStatus()
  if (status !== 'offline') return null
  return (
    <button
      onClick={() => retrySync()}
      title="Saved on this device — tap to retry syncing"
      className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Offline — saved on this device</span>
      <span className="sm:hidden">Offline</span>
      <RefreshCw className="h-3 w-3" />
    </button>
  )
}
