import { Map as MapIcon } from 'lucide-react'
import { Card, Badge, ProgressBar } from '@/components/ui'
import { useRecord, useSettings } from '@/lib/hooks'
import { seedLabel } from '@/lib/domain'
import { JOURNEY_STOPS, journeyProgress } from '@/lib/journey'

// The Bible journey map: a read-only trail of story milestones a child unlocks
// as their lifetime seeds earned grows. Shows where they are, the road to the
// next stop, and the whole path.
export default function BibleJourney({ childId }) {
  const settings = useSettings()
  const child = useRecord('users', childId)

  if (settings.journeyEnabled === false || !child) return null

  const total = child.total_seeds_earned || 0
  const prog = journeyProgress(total)

  return (
    <Card className="overflow-hidden border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 dark:border-sky-900/40 dark:from-sky-900/15 dark:to-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
          <MapIcon className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Bible Journey</span>
        </div>
        <Badge variant="blue">{prog.reachedCount}/{prog.total} stops</Badge>
      </div>

      {/* Current stop */}
      <div className="mt-3 rounded-xl bg-white/70 p-3 dark:bg-gray-900/40">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {prog.current.emoji} {prog.current.name} <span className="font-normal text-gray-400">· {prog.current.ref}</span>
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{prog.current.blurb}</p>
      </div>

      {/* Road to the next stop */}
      {prog.next ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>Next: {prog.next.emoji} {prog.next.name}</span>
            <span>{prog.toNext} more {seedLabel().toLowerCase()}</span>
          </div>
          <ProgressBar value={prog.pctToNext} barClass="bg-sky-500" />
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-sky-700 dark:text-sky-300">✝️ Journey complete — you've traveled the whole story!</p>
      )}

      {/* The whole trail */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {JOURNEY_STOPS.map((stop, i) => {
          const reached = i <= prog.currentIdx
          const isCurrent = i === prog.currentIdx
          return (
            <div key={stop.id} className="flex flex-col items-center gap-1" style={{ minWidth: '3.75rem' }}>
              <span
                title={`${stop.name} — ${stop.threshold}+ ${seedLabel().toLowerCase()}`}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition ${
                  isCurrent
                    ? 'bg-sky-500 text-white ring-2 ring-sky-300 ring-offset-2 dark:ring-offset-gray-900'
                    : reached
                    ? 'bg-sky-100 dark:bg-sky-900/40'
                    : 'bg-gray-100 opacity-40 dark:bg-gray-800'
                }`}
              >
                {reached ? stop.emoji : '🔒'}
              </span>
              <span className={`text-center text-[10px] font-semibold leading-tight ${reached ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                {stop.name}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
