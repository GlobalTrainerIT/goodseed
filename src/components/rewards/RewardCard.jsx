import { Pencil, Trash2 } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import SeedBadge from '@/components/shared/SeedBadge'
import { REWARD_CATEGORIES } from '@/lib/constants'
import { getAll } from '@/lib/db'

export default function RewardCard({ reward, onEdit, onDelete }) {
  const cat = REWARD_CATEGORIES[reward.category] || REWARD_CATEGORIES.other
  const pending = getAll('redemptions').filter((r) => r.reward_id === reward.id && r.status === 'pending').length

  return (
    <Card className="flex gap-3 p-4">
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-3xl" style={{ backgroundColor: cat.color + '22' }}>
        {reward.emoji_icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{reward.title}</h3>
            {reward.description && <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{reward.description}</p>}
          </div>
          <div className="flex flex-shrink-0 gap-1">
            <button onClick={() => onEdit(reward)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(reward)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SeedBadge amount={reward.seed_cost} />
          <Badge variant="purple">{cat.emoji} {cat.label}</Badge>
          {!reward.is_available && <Badge variant="gray">Unavailable</Badge>}
          {pending > 0 && <Badge variant="yellow">{pending} requested</Badge>}
        </div>
      </div>
    </Card>
  )
}
