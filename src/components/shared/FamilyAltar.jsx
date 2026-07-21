import { Flame, Check } from 'lucide-react'
import { Card, Badge, ProgressBar } from '@/components/ui'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import { altarProgress, altarStreakWeeks, toggleAltarStep } from '@/lib/domain'
import { ALTAR_STEPS } from '@/lib/altar'
import { toast } from '@/lib/toast'

// The Family Altar: a weekly whole-family devotional. Anyone in the family
// checks off the steps together; finishing all of them lights the altar and
// rewards every child. Shown on the parent Dashboard and each child's home.
export default function FamilyAltar({ familyId }) {
  const user = useCurrentUser()
  const settings = useSettings()
  useCollection('familyAltar') // re-render as steps are checked

  if (settings.altarEnabled === false || !familyId) return null

  const prog = altarProgress(familyId)
  const streak = altarStreakWeeks(familyId)
  const pct = Math.round((prog.doneCount / prog.total) * 100)

  function toggle(stepId) {
    const wasDone = prog.doneIds.includes(stepId)
    const r = toggleAltarStep(familyId, stepId, user?.id)
    if (r?.completed && !prog.completed && !wasDone) {
      toast({ title: '🕯️ Altar lit!', message: 'Your family finished this week’s devotional together.', emoji: '🕯️' })
    }
  }

  return (
    <Card className={`overflow-hidden p-5 ${prog.completed ? 'border-amber-300 bg-gradient-to-br from-amber-100 to-white dark:border-amber-700 dark:from-amber-900/30 dark:to-gray-900' : 'border-amber-100 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/40 dark:from-amber-900/15 dark:to-gray-900'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Flame className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Family Altar</span>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && <Badge variant="yellow">🔥 {streak} wk{streak === 1 ? '' : 's'}</Badge>}
          <Badge variant={prog.completed ? 'green' : 'gray'}>{prog.doneCount}/{prog.total}</Badge>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {prog.completed ? '🕯️ The altar is lit — beautiful work this week!' : 'Do these together this week. Anyone can check one off.'}
      </p>

      <div className="mt-3">
        <ProgressBar value={pct} barClass="bg-amber-500" />
      </div>

      <div className="mt-4 space-y-2">
        {ALTAR_STEPS.map((step) => {
          const done = prog.doneIds.includes(step.id)
          return (
            <button
              key={step.id}
              onClick={() => toggle(step.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                done
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                  : 'border-gray-200 bg-white hover:border-amber-300 dark:border-gray-800 dark:bg-gray-900'
              }`}
              aria-pressed={done}
            >
              <span className="text-xl">{step.emoji}</span>
              <span className={`flex-1 text-sm font-semibold ${done ? 'text-gray-500 line-through dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {step.label}
              </span>
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 text-transparent dark:border-gray-600'}`}>
                <Check className="h-3.5 w-3.5" />
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
