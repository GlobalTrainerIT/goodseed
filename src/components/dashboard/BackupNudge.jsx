import { Download, ShieldAlert, X } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { useCurrentUser, useSettings, useRecord } from '@/lib/hooks'
import { exportData, updateSettings } from '@/lib/db'
import { isPlus } from '@/lib/plan'
import { toast } from '@/lib/toast'

const MONTH = 30 * 24 * 60 * 60 * 1000

// Free families are local-only: their data lives on this device and nowhere
// else. One cleared browser and it's gone — so nudge them to keep a backup.
// (Plus families sync to the cloud and don't need this.)
export default function BackupNudge() {
  const user = useCurrentUser()
  const family = useRecord('families', user?.family_id)
  const settings = useSettings()

  if (!user || user.role !== 'parent' || !family) return null
  if (isPlus(family)) return null // synced — already safe

  const last = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0
  const snoozed = settings.backupSnoozedAt ? new Date(settings.backupSnoozedAt).getTime() : 0
  const stale = Date.now() - last > MONTH
  const recentlySnoozed = Date.now() - snoozed < MONTH
  if (!stale || recentlySnoozed) return null

  function download() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `goodseed-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    updateSettings({ lastBackupAt: new Date().toISOString() })
    toast({ title: 'Backup saved!', message: 'Keep it somewhere safe.', emoji: '💾' })
  }

  return (
    <Card className="mb-5 border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {last ? 'Time for a fresh backup' : 'Keep your family safe — download a backup'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              On the Free plan your family lives only on this device. If it's lost or the browser is cleared, so is your data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={download}><Download className="h-4 w-4" /> Download backup</Button>
          <button
            onClick={() => updateSettings({ backupSnoozedAt: new Date().toISOString() })}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Remind me later"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}
