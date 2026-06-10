import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { getById } from '@/lib/db'
import { relativeTime } from '@/lib/utils'

const ICONS = {
  task_completed: '✅',
  task_approved: '✅',
  seeds_awarded: '🌱',
  seeds_deducted: '💸',
  reward_redeemed: '🎁',
  badge_earned: '🏅',
  shoutout_given: '💬',
  goal_completed: '🎯',
  level_up: '⭐',
}

export default function ActivityFeed({ entries }) {
  if (!entries.length) {
    return <EmptyState icon="📭" title="No activity yet" description="Completed tasks, seeds, and badges will show up here." />
  }
  return (
    <div className="space-y-2">
      {entries.map((a) => {
        const u = a.user_id ? getById('users', a.user_id) : null
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            {u ? (
              <Avatar user={u} size="sm" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-seed-100 text-lg dark:bg-seed-900/40">
                {ICONS[a.action_type] || '•'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                <span className="mr-1">{ICONS[a.action_type] || '•'}</span>
                {a.description}
              </p>
              <p className="text-xs text-gray-400">{relativeTime(a.timestamp)}</p>
            </div>
            {a.seeds_delta != null && a.seeds_delta !== 0 && (
              <span className={`text-sm font-bold ${a.seeds_delta > 0 ? 'text-seed-600' : 'text-red-500'}`}>
                {a.seeds_delta > 0 ? '+' : ''}{a.seeds_delta} 🌱
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
