import { levelProgress } from '@/lib/domain'
import { ProgressBar } from '@/components/ui'

export default function LevelProgress({ xp = 0 }) {
  const { level, into, span, pct } = levelProgress(xp)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-extrabold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {level}
          </span>
          Level {level}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {into} / {span} XP
        </span>
      </div>
      <ProgressBar value={pct} barClass="bg-gradient-to-r from-purple-500 to-fuchsia-500" />
    </div>
  )
}
