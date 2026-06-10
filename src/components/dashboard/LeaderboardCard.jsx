import { Link } from 'react-router-dom'
import { Trophy, History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import SeedBadge from '@/components/shared/SeedBadge'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { lastWeekWinner } from '@/lib/domain'
import { cn } from '@/lib/utils'

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardCard() {
  const user = useCurrentUser()
  const users = useCollection('users')
  useCollection('leaderboardSnapshots')
  const lastWeek = lastWeekWinner(user?.family_id)
  const children = users
    .filter((u) => u.family_id === user?.family_id && u.role === 'child')
    .sort((a, b) => (b.seed_balance || 0) - (a.seed_balance || 0))

  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
          <Trophy className="h-5 w-5 text-amber-500" /> Family Leaderboard
        </h3>
        {lastWeek?.winner_name && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-900/10">
            <History className="h-4 w-4 text-amber-500" />
            <span className="text-gray-600 dark:text-gray-300">Last week's winner: <b>{lastWeek.winner_name}</b> 🏆</span>
          </div>
        )}
        {children.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Add children to see the leaderboard.</p>
        ) : (
          <div className="space-y-1.5">
            {children.map((c, i) => (
              <Link
                key={c.id}
                to={`/ChildProfile/${c.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-800',
                  i === 0 && 'bg-amber-50 dark:bg-amber-900/10'
                )}
              >
                <span className="w-6 text-center text-lg font-bold text-gray-400">{MEDAL[i] || i + 1}</span>
                <Avatar user={c} size="sm" />
                <span className="flex-1 font-semibold text-gray-900 dark:text-gray-100">{c.full_name}</span>
                <SeedBadge amount={c.seed_balance || 0} showLabel={false} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
