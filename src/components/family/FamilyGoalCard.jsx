import { Card, Button, Badge, ProgressBar } from '@/components/ui'
import { Trash2, Target, PartyPopper } from 'lucide-react'
import { dueLabel } from '@/lib/utils'

export default function FamilyGoalCard({ goal, onContribute, onDelete }) {
  const pct = goal.target_seeds ? Math.round((goal.current_seeds / goal.target_seeds) * 100) : 0
  const completed = goal.status === 'completed' || goal.current_seeds >= goal.target_seeds
  return (
    <Card className={completed ? 'border-seed-300 bg-seed-50/60 dark:border-seed-800 dark:bg-seed-900/10' : ''}>
      <div className="p-5">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seed-100 text-2xl dark:bg-seed-900/30">🎯</div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">{goal.title}</h3>
              {completed ? <Badge variant="green"><PartyPopper className="h-3 w-3" /> Completed!</Badge> : goal.deadline && <span className="text-xs text-gray-400">Ends {dueLabel(goal.deadline)}</span>}
            </div>
          </div>
          {onDelete && (
            <button onClick={() => onDelete(goal)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {goal.description && <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{goal.description}</p>}
        <div className="mb-1 flex items-center justify-between text-sm font-semibold">
          <span className="text-gray-700 dark:text-gray-200">🌱 {goal.current_seeds} / {goal.target_seeds}</span>
          <span className="text-gray-400">{pct}%</span>
        </div>
        <ProgressBar value={pct} barClass="bg-gradient-to-r from-seed-400 to-seed-600" />
        {!completed && onContribute && (
          <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => onContribute(goal)}>
            <Target className="h-4 w-4" /> Contribute seeds
          </Button>
        )}
      </div>
    </Card>
  )
}
