import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Bell } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button, Tabs } from '@/components/ui'
import EmptyState from '@/components/shared/EmptyState'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { update } from '@/lib/db'
import { relativeTime, cn } from '@/lib/utils'

const TYPE_EMOJI = { tasks: '✅', rewards: '🎁', family: '👨‍👩‍👧', system: '🔔' }

export default function NotificationCenter() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const all = useCollection('notifications')
  const [filter, setFilter] = useState('all')

  const mine = all
    .filter((n) => n.user_id === user?.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))

  const unread = mine.filter((n) => !n.is_read)
  let visible = mine
  if (filter === 'unread') visible = mine.filter((n) => !n.is_read)
  else if (filter !== 'all') visible = mine.filter((n) => n.type === filter)

  function markAllRead() {
    mine.forEach((n) => !n.is_read && update('notifications', n.id, { is_read: true }))
  }
  function open(n) {
    update('notifications', n.id, { is_read: true })
    if (n.link_to) navigate(n.link_to)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unread.length ? `${unread.length} unread` : 'You are all caught up'}
        actions={mine.length > 0 && <Button variant="secondary" onClick={markAllRead}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      />
      <Tabs
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: unread.length },
          { value: 'tasks', label: 'Tasks' },
          { value: 'rewards', label: 'Rewards' },
          { value: 'family', label: 'Family' },
        ]}
        value={filter}
        onChange={setFilter}
        className="mb-4"
      />
      {visible.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6 text-seed-500" />} title="Nothing here" description="New notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {visible.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition hover:shadow-sm',
                n.is_read
                  ? 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
                  : 'border-l-4 border-l-seed-500 border-gray-100 bg-seed-50/50 dark:border-gray-800 dark:bg-seed-900/10'
              )}
            >
              <div className="text-xl">{TYPE_EMOJI[n.type] || '🔔'}</div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm text-gray-900 dark:text-gray-100', !n.is_read && 'font-bold')}>{n.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{n.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">{relativeTime(n.created_date)}</p>
              </div>
              {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-seed-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
