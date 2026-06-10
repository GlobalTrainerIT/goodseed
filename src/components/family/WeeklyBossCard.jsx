import { Card, Button, Badge, ProgressBar } from '@/components/ui'
import SeedBadge from '@/components/shared/SeedBadge'
import { formatDate } from '@/lib/utils'

export default function WeeklyBossCard({ boss, onEdit }) {
  const pct = boss.total_tasks_required ? Math.round((boss.tasks_completed / boss.total_tasks_required) * 100) : 0
  const defeated = boss.status === 'completed' || boss.tasks_completed >= boss.total_tasks_required
  return (
    <Card className="overflow-hidden">
      <div className={`p-6 text-center ${defeated ? 'bg-gradient-to-br from-seed-500 to-seed-700' : 'bg-gradient-to-br from-purple-600 to-indigo-700'} text-white`}>
        <div className="text-6xl">{defeated ? '🎉' : boss.emoji || '🐲'}</div>
        <h3 className="mt-2 text-xl font-extrabold">{boss.title}</h3>
        <p className="mt-1 text-sm text-white/80">{boss.description}</p>
        {defeated && <Badge variant="green" className="mt-2 bg-white text-seed-700">Defeated!</Badge>}
      </div>
      <div className="p-5">
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
          All children must complete <b>{boss.total_tasks_required}</b> tasks this week to defeat the boss!
        </p>
        <div className="mb-1 flex items-center justify-between text-sm font-semibold">
          <span className="text-gray-700 dark:text-gray-200">{boss.tasks_completed} / {boss.total_tasks_required} tasks</span>
          <span className="text-gray-400">{pct}%</span>
        </div>
        <ProgressBar value={pct} barClass={defeated ? 'bg-seed-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-400">{formatDate(boss.week_start, 'MMM d')} – {formatDate(boss.week_end, 'MMM d')}</span>
          <div className="flex items-center gap-2">
            <SeedBadge amount={boss.seed_bonus} showLabel={false} />
            <span className="text-xs text-gray-400">{boss.reward_description}</span>
          </div>
        </div>
        {onEdit && <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => onEdit(boss)}>Edit Boss</Button>}
      </div>
    </Card>
  )
}
