import { Sheet, Badge, Button } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import SeedBadge from '@/components/shared/SeedBadge'
import StatusBadge from '@/components/shared/StatusBadge'
import PhotoProof from '@/components/shared/PhotoProof'
import { TASK_CATEGORIES } from '@/lib/constants'
import { getAll } from '@/lib/db'
import { taskAppliesTo, latestCompletion, approveCompletion, rejectCompletion, completeTask } from '@/lib/domain'
import { isOverdue, formatDate, dueLabel } from '@/lib/utils'
import { useCurrentUser } from '@/lib/hooks'
import { Check, X } from 'lucide-react'
import { isToday } from 'date-fns'
import { safeParseDate } from '@/lib/utils'

export default function TaskDetailSheet({ task, open, onClose }) {
  const user = useCurrentUser()
  if (!task) return null
  const cat = TASK_CATEGORIES[task.category] || TASK_CATEGORIES.other
  const children = getAll('users').filter(
    (u) => u.family_id === task.family_id && u.role === 'child' && taskAppliesTo(task, u.id)
  )

  function childState(childId) {
    const comp = latestCompletion(task.id, childId)
    if (!comp) return { status: 'todo', comp: null }
    const sameDay = isToday(safeParseDate(comp.submitted_date) || 0)
    if (comp.status === 'approved' && (task.frequency === 'once' || sameDay)) return { status: 'approved', comp }
    if (comp.status === 'pending_approval' && sameDay) return { status: 'pending_approval', comp }
    if (comp.status === 'rejected' && sameDay) return { status: 'rejected', comp }
    if (task.due_date && isOverdue(task.due_date)) return { status: 'overdue', comp }
    return { status: 'todo', comp }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Task details">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl" style={{ backgroundColor: cat.color + '22' }}>
          {cat.emoji}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{task.title}</h2>
          <p className="text-sm capitalize text-gray-400">{cat.label} · {task.frequency}</p>
        </div>
      </div>

      {task.description && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{task.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <SeedBadge amount={task.seed_value} />
        {task.due_date && (
          <Badge variant={isOverdue(task.due_date) ? 'red' : 'gray'}>
            Due {dueLabel(task.due_date) || formatDate(task.due_date)}
          </Badge>
        )}
        <Badge variant={task.requires_approval ? 'purple' : 'green'}>
          {task.requires_approval ? 'Needs approval' : 'Auto-approved'}
        </Badge>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-bold uppercase text-gray-400">Children</h3>
      <div className="space-y-2">
        {children.map((c) => {
          const { status, comp } = childState(c.id)
          return (
            <div key={c.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar user={c} size="sm" />
                <span className="flex-1 font-semibold text-gray-900 dark:text-gray-100">{c.full_name}</span>
                <StatusBadge status={status} />
              </div>
              {comp?.note && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">"{comp.note}"</p>}
              {comp?.photo && <div className="mt-2"><PhotoProof src={comp.photo} /></div>}
              {status === 'pending_approval' && user?.role === 'parent' && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => approveCompletion(comp.id, user.id)}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={() => rejectCompletion(comp.id, user.id)}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
              {(status === 'todo' || status === 'overdue' || status === 'rejected') && user?.role === 'parent' && (
                <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => completeTask(task.id, c.id)}>
                  <Check className="h-4 w-4" /> Mark done{task.requires_approval ? ' (needs approval)' : ''}
                </Button>
              )}
            </div>
          )
        })}
        {children.length === 0 && <p className="text-sm text-gray-400">No children assigned.</p>}
      </div>
    </Sheet>
  )
}
