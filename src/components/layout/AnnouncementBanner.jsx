import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useCollection, useCurrentUser } from '@/lib/hooks'

const DISMISS_KEY = 'goodseed_dismissed_announcement'

export default function AnnouncementBanner() {
  const user = useCurrentUser()
  const announcements = useCollection('announcements')
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY)
    } catch {
      return null
    }
  })

  if (!user) return null
  const familyAnns = announcements
    .filter((a) => a.family_id === user.family_id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
  const latest = familyAnns.find((a) => a.is_pinned) || familyAnns[0]
  if (!latest || dismissed === latest.id) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, latest.id)
    } catch {
      /* ignore */
    }
    setDismissed(latest.id)
  }

  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-900/50 dark:bg-amber-900/20">
      <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-amber-800 dark:text-amber-300">{latest.title}</span>{' '}
        <span className="text-amber-700 dark:text-amber-200/80">{latest.message}</span>
      </div>
      <button onClick={dismiss} className="text-amber-500 hover:text-amber-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
