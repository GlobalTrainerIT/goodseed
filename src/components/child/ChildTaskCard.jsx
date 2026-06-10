import { useState } from 'react'
import { Card } from '@/components/ui'
import { Check, Clock, RotateCcw } from 'lucide-react'
import { TASK_CATEGORIES } from '@/lib/constants'
import { latestCompletion, completeTask, seedWord } from '@/lib/domain'
import { isToday } from 'date-fns'
import { safeParseDate, cn } from '@/lib/utils'
import TaskDoneDialog from './TaskDoneDialog'

export default function ChildTaskCard({ task, childId }) {
  const [doneOpen, setDoneOpen] = useState(false)
  const cat = TASK_CATEGORIES[task.category] || TASK_CATEGORIES.other
  const comp = latestCompletion(task.id, childId)

  // For recurring tasks, a completion only "counts" for today.
  let state = 'todo'
  if (comp) {
    const sameDay = comp.submitted_date && isToday(safeParseDate(comp.submitted_date) || 0)
    if (comp.status === 'approved' && (task.frequency === 'once' || sameDay)) state = 'approved'
    else if (comp.status === 'pending_approval' && sameDay) state = 'pending'
    else if (comp.status === 'rejected' && sameDay) state = 'rejected'
  }

  const done = state === 'approved'
  const pending = state === 'pending'

  return (
    <Card className={cn('flex items-center gap-3 p-4', done && 'opacity-70')}>
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: cat.color + '22' }}>
        {cat.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('font-bold text-gray-900 dark:text-gray-100', done && 'line-through')}>{task.title}</p>
        <p className="text-xs text-gray-400">🌱 {task.seed_value} {seedWord(task.seed_value)} · {cat.label}</p>
      </div>
      {done ? (
        <span className="flex items-center gap-1 rounded-full bg-seed-100 px-3 py-1.5 text-sm font-semibold text-seed-700 dark:bg-seed-900/40 dark:text-seed-300">
          <Check className="h-4 w-4" /> Done
        </span>
      ) : pending ? (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Clock className="h-4 w-4" /> Pending
        </span>
      ) : (
        <button
          onClick={() => (task.requires_approval ? setDoneOpen(true) : completeTask(task.id, childId))}
          className="flex items-center gap-1.5 rounded-full bg-seed-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-seed-700 active:scale-95"
        >
          {state === 'rejected' ? <><RotateCcw className="h-4 w-4" /> Try again</> : <><Check className="h-4 w-4" /> Mark done</>}
        </button>
      )}
      <TaskDoneDialog task={task} childId={childId} open={doneOpen} onClose={() => setDoneOpen(false)} />
    </Card>
  )
}
