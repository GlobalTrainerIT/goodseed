import { Card, Button } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import SeedBadge from '@/components/shared/SeedBadge'
import { Check, X } from 'lucide-react'
import { getById } from '@/lib/db'
import { resolveRedemption } from '@/lib/domain'
import { relativeTime } from '@/lib/utils'
import { useCurrentUser } from '@/lib/hooks'

export default function RedemptionList({ redemptions }) {
  const user = useCurrentUser()
  if (!redemptions.length) return null
  return (
    <Card className="mb-5 border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/40 dark:bg-purple-900/10">
      <h3 className="mb-3 text-sm font-bold uppercase text-purple-700 dark:text-purple-300">
        🎁 Pending Redemptions ({redemptions.length})
      </h3>
      <div className="space-y-2">
        {redemptions.map((r) => {
          const reward = getById('rewards', r.reward_id)
          const child = getById('users', r.child_id)
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 dark:bg-gray-900">
              <Avatar user={child} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {child?.full_name} wants {reward?.emoji_icon} {reward?.title}
                </p>
                <p className="text-xs text-gray-400">{relativeTime(r.requested_date)}</p>
              </div>
              <SeedBadge amount={reward?.seed_cost || 0} showLabel={false} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolveRedemption(r.id, true, user.id)}><Check className="h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="danger" onClick={() => resolveRedemption(r.id, false, user.id)}><X className="h-4 w-4" /> Reject</Button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
