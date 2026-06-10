import { Pencil, Trash2, RefreshCw, Users, AlertTriangle, Clock } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import SeedBadge from '@/components/shared/SeedBadge'
import { TASK_CATEGORIES } from '@/lib/constants'
import { getAll } from '@/lib/db'
import { isOverdue, dueLabel, formatDate, cn } from '@/lib/utils'

export default function TaskCard({ task, onEdit, onDelete, onOpen }) {
  const cat = TASK_CATEGORIES[task.category] || TASK_CATEGORIES.other
  const overdue = task.due_date && isOverdue(task.due_date)
  const assignedCount = task.assigned_children?.length || 0
  const pending = getAll('completions').filter((c) => c.task_id === task.id && c.status === 'pending_approval').length

  return (
    <Card
      className={cn(
        'relative cursor-pointer p-4 transition hover:shadow-md',
        overdue && 'border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-900/10'
      )}
      onClick={() => onOpen?.(task)}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: cat.color + '22' }}>
          {cat.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">{task.title}</h3>
              {task.description && <p className="mt-0.5 line-clamp-1 text-sm text-gray-500 dark:text-gray-400">{task.description}</p>}
            </div>
            <div className="flex flex-shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onEdit(task)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-seed-600 dark:hover:bg-gray-800">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(task)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <SeedBadge amount={task.seed_value} showLabel={false} />
            <Badge variant="gray">{cat.emoji} {cat.label}</Badge>
            {task.frequency !== 'once' && (
              <Badge variant="blue"><RefreshCw className="h-3 w-3" /> {task.frequency}</Badge>
            )}
            {overdue ? (
              <Badge variant="red"><AlertTriangle className="h-3 w-3" /> Overdue · {dueLabel(task.due_date)}</Badge>
            ) : task.due_date ? (
              <Badge variant="gray"><Clock className="h-3 w-3" /> {dueLabel(task.due_date) || formatDate(task.due_date)}</Badge>
            ) : null}
            <Badge variant="gray"><Users className="h-3 w-3" /> {assignedCount === 0 ? 'All' : assignedCount}</Badge>
            {pending > 0 && <Badge variant="yellow">{pending} pending</Badge>}
          </div>
        </div>
      </div>
    </Card>
  )
}
