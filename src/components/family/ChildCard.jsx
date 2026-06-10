import { Link } from 'react-router-dom'
import { Plus, Minus, Trash2, ChevronRight } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'

export default function ChildCard({ child, onAward, onDeduct, onDelete }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar user={child} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{child.full_name}</h3>
            {child.age != null && <Badge variant="gray">Age {child.age}</Badge>}
            <Badge variant={child.managed ? 'gray' : 'green'}>{child.managed ? 'Managed' : 'Active'}</Badge>
          </div>
          <Link to={`/ChildProfile/${child.id}`} className="mt-0.5 flex items-center gap-0.5 text-sm font-medium text-seed-600 hover:underline">
            View Profile <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button onClick={() => onDelete(child)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-seed-50 p-2.5 text-center dark:bg-seed-900/20">
          <p className="text-lg font-extrabold text-seed-700 dark:text-seed-300">🌱 {child.seed_balance || 0}</p>
          <p className="text-xs text-gray-400">Seeds</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5 text-center dark:bg-gray-800">
          <p className="text-lg font-extrabold text-gray-700 dark:text-gray-200">{child.total_seeds_earned || 0}</p>
          <p className="text-xs text-gray-400">Total Earned</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => onAward(child)}><Plus className="h-4 w-4" /> Award</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onDeduct(child)}><Minus className="h-4 w-4" /> Deduct</Button>
      </div>
    </Card>
  )
}
